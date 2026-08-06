import crypto from "node:crypto";
import { requireJwt, normalizeEmail, sendError } from "../lib/auth.js";
import { getZohoAccessToken } from "../services/zohoAuth.js";
import {
  createWorkdriveFolder,
  fetchWorkdriveMe,
  listFolderItems,
  uploadWorkdriveFile,
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
}

/**
 * Multipart scratch upload that accepts optional folderId field.
 * Registered from documentsList to keep one upload endpoint; helper exported for reuse.
 */
export async function uploadScratchWithPersonalFolder(pool, request, reply) {
  const actor = requireJwt(request);
  const fields = {};
  let filePart = null;
  for await (const part of request.parts()) {
    if (part.type === "file") {
      const chunks = [];
      for await (const chunk of part.file) chunks.push(chunk);
      filePart = {
        filename: part.filename || "upload.bin",
        mimetype: part.mimetype || "application/octet-stream",
        buffer: Buffer.concat(chunks),
      };
    } else if (part.fieldname) {
      fields[part.fieldname] = part.value;
    }
  }
  if (!filePart?.buffer?.length) {
    return reply.code(400).send({ error: "file_required" });
  }

  try {
    const accessToken = await getZohoAccessToken(pool, actor.email);
    const { rootId } = await resolvePersonalRoot(accessToken);
    let parentId = fields.folderId ? String(fields.folderId).trim() : rootId;
    if (!parentId) parentId = rootId;

    const uploaded = await uploadWorkdriveFile(accessToken, {
      parentId,
      filename: filePart.filename,
      buffer: filePart.buffer,
      contentType: filePart.mimetype,
    });

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
          $1,$2,$3,$4,'scratch',$5,'draft','scratch',
          $6,$6,$6,'none',$7,$8,$9,$10,
          false, now(), now()
        )
        returning *
      `,
      [
        id,
        uploaded.id,
        parentId,
        uploaded.permalink,
        filePart.filename,
        normalizeEmail(actor.email),
        ver.version,
        ver.label,
        ver.major,
        ver.minor,
      ],
    );

    await pool.query(
      `
        insert into document_versions(
          document_id, workdrive_file_id, workdrive_permalink,
          version, version_label, version_major, version_minor, uploaded_by_email
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        id,
        uploaded.id,
        uploaded.permalink || null,
        ver.version,
        ver.label,
        ver.major,
        ver.minor,
        normalizeEmail(actor.email),
      ],
    );

    return reply.send({ ok: true, document: rows[0], workdrive: uploaded, folderId: parentId });
  } catch (e) {
    return sendError(reply, e);
  }
}
