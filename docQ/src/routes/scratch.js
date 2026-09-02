import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { requireJwt, normalizeEmail, sendError } from "../lib/auth.js";
import { getZohoAccessToken } from "../services/zohoAuth.js";
import {
  createWorkdriveFolder,
  fetchWorkdriveMe,
  listFolderItems,
  uploadWorkdriveFile,
  downloadWorkdriveFile,
} from "../services/workdrive.js";
import { env } from "../config.js";
import { initialDraftVersion } from "../lib/versioning.js";
import {
  enrichDumpFiles,
  ensureScratchDocument,
  registerDumpToManaged,
} from "../services/dumpRegister.js";

/**
 * Personal dump root = user's My Folders (never the org Team Folder Temp_Folder).
 */
async function resolvePersonalRoot(accessToken) {
  if (env.scratchRootFolderId) {
    return { rootId: env.scratchRootFolderId, me: null };
  }
  const me = await fetchWorkdriveMe(accessToken);
  if (me?.myFolderId) {
    return { rootId: me.myFolderId, me };
  }
  const e = new Error(
    "Could not resolve personal WorkDrive space (My Folders / privatespace). Open Zoho WorkDrive once, then sign out and sign back into erpQ with Zoho.",
  );
  e.statusCode = 412;
  e.code = "personal_folder_missing";
  throw e;
}

async function ensureFolderPath(accessToken, rootId, pathStr) {
  const parts = String(pathStr || "")
    .split(/[/\\]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let parentId = rootId;
  let last = { id: rootId, name: "My Folders", kind: "folder" };
  for (const name of parts) {
    const listed = await listFolderItems(accessToken, parentId);
    const hit = listed.items.find(
      (i) => i.kind === "folder" && String(i.name).trim().toLowerCase() === name.toLowerCase(),
    );
    if (hit) {
      last = hit;
      parentId = hit.id;
      continue;
    }
    last = await createWorkdriveFolder(accessToken, { parentId, name });
    parentId = last.id;
  }
  return last;
}

async function deleteFolderRecursively(accessToken, folderId) {
  // 1. List contents of the folder
  const listed = await listFolderItems(accessToken, folderId).catch(() => ({ items: [] }));
  const items = listed.items || [];

  // 2. Delete/trash each child item recursively
  for (const item of items) {
    if (item.kind === "folder") {
      await deleteFolderRecursively(accessToken, item.id);
    } else {
      await fetch(`https://workdrive.zoho.eu/api/v1/files/${item.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Zoho-oauthtoken ${accessToken}` }
      }).catch(() => {});
    }
  }

  // 3. Delete the parent folder itself
  const zohoRes = await fetch(`https://workdrive.zoho.eu/api/v1/files/${folderId}`, {
    method: "DELETE",
    headers: { "Authorization": `Zoho-oauthtoken ${accessToken}` }
  });

  if (!zohoRes.ok && zohoRes.status !== 404) {
    await fetch(`https://workdrive.zoho.eu/api/v1/files/${folderId}/trash`, {
      method: "POST",
      headers: { "Authorization": `Zoho-oauthtoken ${accessToken}` }
    }).catch(() => {});
  }
}

async function trashWorkdriveItem(accessToken, resourceId) {
  const zohoRes = await fetch(
    `https://www.zohoapis.eu/workdrive/api/v1/files/${resourceId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            status: "51",
          },
          type: "files",
        },
      }),
    }
  );

  const responseText = await zohoRes.text();

  if (!zohoRes.ok && zohoRes.status !== 404) {
    throw new Error(`Zoho WorkDrive trash failed: ${responseText}`);
  }

  return {
    ok: true,
    status: zohoRes.status,
    response: responseText,
  };
}

export async function scratchRoutes(app, { pool }) {
  /** List folders + files under personal dump; files enriched with register/share metadata. */
  app.get("/api/v1/docs/scratch/folders", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const { rootId } = await resolvePersonalRoot(accessToken);
      const parentId = request.query?.parentId
        ? String(request.query.parentId).trim()
        : rootId;
      const listed = await listFolderItems(accessToken, parentId);
      const folders = listed.items.filter((i) => i.kind === "folder");
      const rawFiles = listed.items.filter((i) => i.kind !== "folder");
      const files = await enrichDumpFiles(pool, rawFiles);
      return reply.send({
        rootId,
        parentId,
        folders,
        files,
        items: [...folders, ...files],
        warnings: listed.warnings || [],
      });
    } catch (e) {
      return sendError(reply, e);
    }
  });

  /**
   * Create a folder in personal dump space.
   * Body: { name } under parentId, or { path: "a/b/c" } from personal root.
   */
  app.post("/api/v1/docs/scratch/folders", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const accessToken = await getZohoAccessToken(pool, actor.email);
      const { rootId } = await resolvePersonalRoot(accessToken);
      const path = request.body?.path ? String(request.body.path).trim() : "";
      if (path) {
        const folder = await ensureFolderPath(accessToken, rootId, path);
        return reply.send({ ok: true, folder, rootId });
      }
      const name = String(request.body?.name || "").trim();
      if (!name) return reply.code(400).send({ error: "name_or_path_required" });
      const parentId = request.body?.parentId
        ? String(request.body.parentId).trim()
        : rootId;
      const folder = await createWorkdriveFolder(accessToken, { parentId, name });
      return reply.send({ ok: true, folder, rootId, parentId });
    } catch (e) {
      return sendError(reply, e);
    }
  });

  /** Ensure a dump document row exists (needed for Share). */
  app.post("/api/v1/docs/scratch/ensure", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const fileId = String(request.body?.fileId || request.body?.workdriveFileId || "").trim();
      const folderId = request.body?.folderId
        ? String(request.body.folderId).trim()
        : null;
      const title = request.body?.title ? String(request.body.title).trim() : null;
      const permalink = request.body?.permalink
        ? String(request.body.permalink).trim()
        : null;
      const document = await ensureScratchDocument(pool, actor, {
        fileId,
        folderId,
        title,
        permalink,
      });
      return reply.send({ ok: true, document });
    } catch (e) {
      return sendError(reply, e);
    }
  });

  /**
   * Register: copy dump file into managed vault; keep dump file; flag as registered.
   * Body: { fileId, folderId?, title, docType, description?, projectId? }
   */
  app.post("/api/v1/docs/scratch/register", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const fileId = String(request.body?.fileId || request.body?.workdriveFileId || "").trim();
      const folderId = request.body?.folderId
        ? String(request.body.folderId).trim()
        : null;
      const title = request.body?.title ? String(request.body.title).trim() : null;
      const docType = String(request.body?.docType || "general").trim();
      const description =
        request.body?.description !== undefined
          ? request.body.description
            ? String(request.body.description).trim()
            : null
          : undefined;
      const projectId = request.body?.projectId
        ? String(request.body.projectId).trim()
        : null;
      const permalink = request.body?.permalink
        ? String(request.body.permalink).trim()
        : null;

      const scratchDoc = await ensureScratchDocument(pool, actor, {
        fileId,
        folderId,
        title,
        permalink,
      });
      if (scratchDoc.zone !== "scratch") {
        return reply.code(409).send({
          error: "already_registered",
          detail: "This file is already a managed document.",
          managedDocumentId: scratchDoc.id,
        });
      }

      const result = await registerDumpToManaged(pool, actor, {
        scratchDoc,
        docType,
        title,
        description,
        projectId,
      });
      return reply.send({
        ok: true,
        scratch: result.scratch,
        document: result.document,
        workdrive: result.workdrive,
      });
    } catch (e) {
      if (e.message === "already_registered") {
        return reply.code(409).send({
          error: e.message,
          detail: e.detail,
          managedDocumentId: e.managedDocumentId,
        });
      }
      return sendError(reply, e);
    }
  });

  // ==========================================
  // MOVE FILES / FOLDERS (CUT)
  // ==========================================
  app.post("/api/v1/docs/scratch/move", async (request, reply) => {
    const actor = requireJwt(request);
    const items = request.body?.items || [];
    const parentId = request.body?.parentId;

    if (!items.length || !parentId) {
      return reply.code(400).send({ error: "items_and_parentId_required" });
    }

    try {
      const token = await getZohoAccessToken(pool, actor.email);
      const apiBase = env.workdriveApiBase.replace(/\/$/, "");

      for (const item of items) {
        if (item.id === parentId) {
            throw new Error(`Cannot move folder "${item.name}" into itself.`);
        }

        const zohoRes = await fetch(`${apiBase}/workdrive/api/v1/files/${item.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json", // Restored strict Zoho standard
          },
          body: JSON.stringify({
            data: {
              id: item.id,
              attributes: { parent_id: parentId },
              type: "files"
            }
          })
        });

        if (!zohoRes.ok) {
           const errText = await zohoRes.text();
           throw new Error(`Zoho Move Failed: ${errText}`);
        }
        
        await pool.query(
          `UPDATE documents SET workdrive_folder_id = $1 WHERE workdrive_file_id = $2 AND zone = 'scratch'`,
          [parentId, item.id]
        ).catch(() => {}); 
      }

      return reply.send({ ok: true });
    } catch (e) {
      request.log?.error(e, "Move error");
      return sendError(reply, e);
    }
  });

  // ==========================================
  // COPY FILES / FOLDERS
  // ==========================================
  app.post("/api/v1/docs/scratch/copy", async (request, reply) => {
    const actor = requireJwt(request);
    const items = request.body?.items || [];
    const parentId = request.body?.parentId;
    const sourceFolder = request.body?.sourceFolder;

    if (!items.length || !parentId) {
      return reply.code(400).send({ error: "items_and_parentId_required" });
    }

    try {
      const token = await getZohoAccessToken(pool, actor.email);
      const apiBase = env.workdriveApiBase.replace(/\/$/, "");

      for (const item of items) {
        if (item.id === parentId) {
            throw new Error(`Cannot copy folder "${item.name}" into itself.`);
        }

        const itemParent = item.parentId || item.parent_id || sourceFolder;
        
        let newFileId = null;
        let newPermalink = null;
        let finalName = item.name || item.title || "Copy";

        // ========================================================
        // SCENARIO 1: SAME FOLDER (The Bypass Method)
        // ========================================================
        if (itemParent === parentId) {
            // We cannot use Zoho's /copy here because it crashes.
            // Instead, we download it and upload it as a new file!
            
            if (item.kind === 'folder') {
                throw new Error("Cannot duplicate an entire folder in the exact same location yet. Please paste folders in a different location.");
            }

            // Generate the " - Copy" name
            const parts = finalName.split(".");
            if (parts.length > 1) {
                const ext = parts.pop();
                finalName = `${parts.join(".")} - Copy.${ext}`;
            } else {
                finalName = `${finalName} - Copy`;
            }

            // Download the file into server memory
            const downloaded = await downloadWorkdriveFile(token, item.id);
            
            // Upload it as a brand new file
            const uploaded = await uploadWorkdriveFile(token, {
                parentId: parentId,
                filename: finalName,
                buffer: downloaded.buffer,
                contentType: downloaded.contentType,
            });
            
            newFileId = uploaded.id;
            newPermalink = uploaded.permalink || null;
        } 
        // ========================================================
        // SCENARIO 2: DIFFERENT FOLDER (Standard Zoho API)
        // ========================================================
        else {
            // Zoho Copy API requires the destination (parentId) in the URL
            const zohoRes = await fetch(`${apiBase}/workdrive/api/v1/files/${parentId}/copy`, {
              method: "POST",
              headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
              },
              body: JSON.stringify({
                data: [
                  {
                    attributes: { resource_id: item.id },
                    type: "files"
                  }
                ]
              })
            });
            
            if (!zohoRes.ok) {
               const errText = await zohoRes.text();
               throw new Error(`Zoho Copy Failed: ${errText}`);
            }
            
            const jsonResp = await zohoRes.json();
            
            // Since the payload is sent as an array, Zoho returns the new file data in an array
            const newFileData = Array.isArray(jsonResp.data) ? jsonResp.data[0] : jsonResp.data;
            
            if (newFileData && newFileData.id) {
                newFileId = newFileData.id;
                newPermalink = newFileData.attributes?.permalink || null;
            }
        }

        // ========================================================
        // Create local DB reference for the copied file
        // ========================================================
        if (newFileId && item.kind !== 'folder') {
            await pool.query(
              `INSERT INTO documents (
                id, workdrive_file_id, workdrive_folder_id, workdrive_permalink, 
                doc_type, title, state, zone, author_email, created_by_email, modified_by_email, created_at, updated_at
              ) VALUES (gen_random_uuid(), $1, $2, $3, 'scratch', $4, 'draft', 'scratch', $5, $5, $5, now(), now())`,
              [newFileId, parentId, newPermalink, finalName, actor.email]
            ).catch(() => {});
        }
      }

      return reply.send({ ok: true });
    } catch (e) {
      request.log?.error(e, "Copy error");
      return sendError(reply, e);
    }
  });

  // ==========================================
  // RENAME FOLDER / FILE
  // ==========================================
  app.patch("/api/v1/docs/scratch/:type/:id", async (request, reply) => {
    const actor = requireJwt(request);
    const id = String(request.params.id).trim();
    const type = String(request.params.type).trim(); // "folders" or "files"
    const newName = String(request.body?.name || "").trim();

    if (!id || !newName) return reply.code(400).send({ error: "id_and_name_required" });

    try {
      const token = await getZohoAccessToken(pool, actor.email);
      const apiBase = env.workdriveApiBase.replace(/\/$/, "");

      // Rename in Zoho WorkDrive
      const zohoRes = await fetch(`${apiBase}/workdrive/api/v1/files/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            attributes: { name: newName },
            type: "files"
          }
        })
      });

      if (!zohoRes.ok) {
         const errText = await zohoRes.text();
         throw new Error(`Zoho Rename Failed: ${errText}`);
      }

      // If it is a file (dump document), we also need to update the local DB title
      if (type === "files") {
          await pool.query(
            `UPDATE documents SET title = $1, updated_at = now() WHERE workdrive_file_id = $2 AND zone = 'scratch'`,
            [newName, id]
          ).catch(() => {});
      }

      return reply.send({ ok: true, name: newName });
    } catch (e) {
      request.log?.error(e, "Rename error");
      return sendError(reply, e);
    }
  });

  // ==========================================
  // DELETE FOLDER
  // ZOHO WORKDRIVE + POSTGRES
  // ==========================================
  app.delete("/api/v1/docs/scratch/folders/:id", async (request, reply) => {
    const actor = requireJwt(request);
    const folderId = String(request.params.id).trim();

    try {
      if (!folderId) {
        return reply.code(400).send({
          error: "folder_id_required",
        });
      }

      const token = await getZohoAccessToken(pool, actor.email);

      // Move the folder to Zoho WorkDrive Trash.
      // WorkDrive handles the folder and its contents.
      await trashWorkdriveItem(token, folderId);

      folderResolutionCache.clear();
      folderCreationLocks.clear();

      // 1) NEW: Delete the folder share records so it disappears from "Shared by me"
      await pool
        .query(
          `DELETE FROM folder_shares WHERE folder_id = $1`,
          [folderId]
        )
        .catch((e) => request.log?.warn(e, "Failed to delete folder shares"));

      // 2) Remove local scratch-folder record.
      await pool
        .query(
          `
            DELETE FROM scratch_folders
            WHERE id = $1
              OR workdrive_folder_id = $1
          `,
          [folderId]
        )
        .catch(() => {});

      return reply.send({
        ok: true,
        message: "Folder deleted successfully.",
      });
    } catch (e) {
      request.log?.error(e, "Folder deletion error");
      return sendError(reply, e);
    }
  });


  // ==========================================
  // DELETE FILE / DUMP
  // ZOHO WORKDRIVE + POSTGRES
  // ==========================================
  app.delete("/api/v1/docs/scratch/files/:id", async (request, reply) => {
    const actor = requireJwt(request);
    const fileId = String(request.params.id).trim();

    try {
      if (!fileId) {
        return reply.code(400).send({
          error: "file_id_required",
        });
      }

      let file = null;

      // First try WorkDrive file ID.
      let dbRes = await pool.query(
        `
          SELECT *
          FROM documents
          WHERE workdrive_file_id = $1
            AND zone = 'scratch'
        `,
        [fileId]
      );

      file = dbRes.rows[0];

      // If not found, try internal document UUID.
      if (!file) {
        try {
          dbRes = await pool.query(
            `
              SELECT *
              FROM documents
              WHERE id = $1::uuid
                AND zone = 'scratch'
            `,
            [fileId]
          );

          file = dbRes.rows[0];
        } catch (_) {
          // Ignore invalid UUID.
        }
      }

      const token = await getZohoAccessToken(pool, actor.email);
      const workdriveFileId = file?.workdrive_file_id || fileId;

      if (workdriveFileId) {
        // Move the WorkDrive file to Trash.
        await trashWorkdriveItem(token, workdriveFileId);
      }

      // Delete local database records
      if (file) {
        // 1) NEW: Delete document shares so it disappears from "Shared by me"
        await pool.query(
          `DELETE FROM document_shares WHERE document_id = $1`,
          [file.id]
        ).catch((e) => request.log?.warn(e, "Failed to delete document shares"));

        // 2) Delete local version records
        await pool.query(
          `DELETE FROM document_versions WHERE document_id = $1`,
          [file.id]
        );

        // 3) Delete local document record
        await pool.query(
          `DELETE FROM documents WHERE id = $1`,
          [file.id]
        );
      }

      return reply.send({
        ok: true,
        message: "File deleted successfully.",
      });
    } catch (e) {
      request.log?.error(e, "File deletion error");
      return sendError(reply, e);
    }
  });
}

/**
 * Multipart scratch upload that preserves the complete folder hierarchy.
 * Uses Disk Streaming to prevent Memory (RAM) exhaustion on large folder uploads.
 */
export async function uploadScratchWithPersonalFolder(pool, request, reply) {
  const actor = requireJwt(request);

  const fields = {};
  let filePart = null;
  let tempFilePath = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      // 1. Stream the incoming browser upload to disk to save RAM
      tempFilePath = path.join(os.tmpdir(), `docq-upload-${crypto.randomUUID()}.tmp`);
      await pipeline(part.file, fs.createWriteStream(tempFilePath));

      filePart = {
        filename: part.filename || "upload.bin",
        mimetype: part.mimetype || "application/octet-stream",
        filepath: tempFilePath,
      };
    } else if (part.fieldname) {
      fields[part.fieldname] = part.value;
    }
  }

  if (!filePart?.filepath) {
    if (tempFilePath) await fs.promises.unlink(tempFilePath).catch(() => {});
    return reply.code(400).send({ error: "file_required" });
  }

  try {
    const accessToken = await getZohoAccessToken(pool, actor.email);

    /*
     * THE FIX: Only query Zoho for the Personal Root if the frontend
     * didn't provide a folderId. This saves HUNDREDS of API calls 
     * per minute during batch folder uploads!
     */
    let parentId = fields.folderId ? String(fields.folderId).trim() : null;
    if (!parentId) {
      const { rootId } = await resolvePersonalRoot(accessToken);
      parentId = rootId;
    }

    const relativePath = String(
      fields.webkitRelativePath || filePart.filename || ""
    ).trim();

    const normalizedPath = relativePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+/g, "/");

    const pathParts = normalizedPath
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    const filename =
      pathParts.length > 0
        ? pathParts[pathParts.length - 1]
        : filePart.filename;

    const folderParts = pathParts.slice(0, -1);

    if (folderParts.length > 0) {
      const folderPath = folderParts.join("/");
      const finalFolder = await ensureFolderPathFromParent(
        accessToken,
        parentId,
        folderPath
      );
      parentId = finalFolder.id;
    }

    const fileBuffer = await fs.promises.readFile(filePart.filepath);

    const uploaded = await uploadWorkdriveFile(accessToken, {
      parentId,
      filename,
      buffer: fileBuffer,
      contentType: filePart.mimetype,
    });
    /*
     * Create local document record.
     */
    const id = crypto.randomUUID();
    const ver = initialDraftVersion();

    const { rows } = await pool.query(
      `
        insert into documents(
          id, workdrive_file_id, workdrive_folder_id, workdrive_permalink,
          doc_type, title, state, zone,
          author_email, created_by_email, modified_by_email,
          workflow_mode, version, version_label, version_major, version_minor,
          dump_registered, created_at, updated_at
        )
        values (
          $1, $2, $3, $4, 'scratch', $5, 'draft', 'scratch',
          $6, $6, $6, 'none', $7, $8, $9, $10,
          false, now(), now()
        )
        returning *
      `,
      [
        id, uploaded.id, parentId, uploaded.permalink, filename,
        normalizeEmail(actor.email), ver.version, ver.label, ver.major, ver.minor,
      ]
    );

    /*
     * Create document version record.
     */
    await pool.query(
      `
        insert into document_versions(
          document_id, workdrive_file_id, workdrive_permalink,
          version, version_label, version_major, version_minor, uploaded_by_email
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id, uploaded.id, uploaded.permalink || null, ver.version,
        ver.label, ver.major, ver.minor, normalizeEmail(actor.email),
      ]
    );

    return reply.send({
      ok: true,
      document: rows[0],
      workdrive: uploaded,
      folderId: parentId,
      relativePath: normalizedPath,
    });
  } catch (e) {
    return sendError(reply, e);
  } finally {
    // 4. Always delete the temp file from disk
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
}

/**
 * Create/find a nested folder path with IN-MEMORY CACHING and MUTEX LOCKS
 * to prevent Zoho API rate-limiting and race condition crashes.
 */
const folderResolutionCache = new Map(); 
const folderCreationLocks = new Map(); // NEW: Prevents Zoho from crashing on concurrent folder uploads

async function ensureFolderPathFromParent(accessToken, parentId, pathStr) {
  const parts = String(pathStr || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  let currentParentId = parentId;
  let last = { id: parentId, name: "Current Folder", kind: "folder" };

  for (const name of parts) {
    const cacheKey = `${currentParentId}-${name.toLowerCase()}`;
    
    // 1. If it's fully cached, use it immediately
    if (folderResolutionCache.has(cacheKey)) {
      last = folderResolutionCache.get(cacheKey);
      currentParentId = last.id;
      continue;
    }

    // 2. If another file is currently creating this exact folder, WAIT for it!
    if (folderCreationLocks.has(cacheKey)) {
      last = await folderCreationLocks.get(cacheKey);
      currentParentId = last.id;
      continue;
    }

    // 3. Lock this folder path so other files wait instead of querying Zoho
    let resolveLock;
    const lockPromise = new Promise((resolve) => { resolveLock = resolve; });
    folderCreationLocks.set(cacheKey, lockPromise);

    try {
      const listed = await listFolderItems(accessToken, currentParentId);
      const hit = (listed.items || []).find(
        (item) =>
          item.kind === "folder" &&
          String(item.name || "").trim().toLowerCase() === name.toLowerCase()
      );

      if (hit) {
        last = hit;
      } else {
        last = await createWorkdriveFolder(accessToken, {
          parentId: currentParentId,
          name,
        });
      }

      folderResolutionCache.set(cacheKey, last);
      resolveLock(last); // Release the lock, pass the folder down to waiting files
      folderCreationLocks.delete(cacheKey);
    } catch (e) {
      folderCreationLocks.delete(cacheKey);
      throw e;
    }

    currentParentId = last.id;
  }

  return last;
}