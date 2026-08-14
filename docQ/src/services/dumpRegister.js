import crypto from "node:crypto";
import { normalizeEmail } from "../lib/auth.js";
import { env } from "../config.js";
import { initialDraftVersion } from "../lib/versioning.js";
import {
  getServiceZohoAccessToken,
  getZohoAccessToken,
} from "./zohoAuth.js";
import {
  downloadWorkdriveFile,
  uploadWorkdriveFile,
} from "./workdrive.js";
import { ensureSharedLibrary } from "./sharedLibrary.js";
import { grantVaultFileAccess } from "./vaultAccess.js";
import { ensureProjectDocTypeFolder } from "./projectFolders.js";

async function resolveManagedParent(pool, serviceToken, actor) {
  const serviceEmail = env.serviceZohoEmail || actor.email;
  const library = await ensureSharedLibrary(pool, serviceToken, serviceEmail, actor);
  return library.managedFolderId;
}

/**
 * Ensure a scratch (dump) document row exists for a WorkDrive file in personal space.
 */
export async function ensureScratchDocument(pool, actor, {
  fileId,
  folderId = null,
  title = null,
  permalink = null,
}) {
  const wdId = String(fileId || "").trim();
  if (!wdId) {
    const e = new Error("workdrive_file_required");
    e.statusCode = 400;
    throw e;
  }
  const email = normalizeEmail(actor.email);
  const { rows: existing } = await pool.query(
    `select * from documents where workdrive_file_id = $1 limit 1`,
    [wdId],
  );
  if (existing[0]) {
    if (existing[0].zone === "scratch") return existing[0];
    // File already owns a managed row (legacy promote) — treat as already registered.
    return existing[0];
  }

  const id = crypto.randomUUID();
  const ver = initialDraftVersion();
  const name = title || "Untitled";
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
      wdId,
      folderId,
      permalink,
      name,
      email,
      ver.version,
      ver.label,
      ver.major,
      ver.minor,
    ],
  );
  return rows[0];
}

/**
 * Copy a dump file into the managed vault as a NEW document.
 * Dump file + scratch row stay; scratch is flagged dump_registered.
 */
export async function registerDumpToManaged(pool, actor, {
  scratchDoc,
  docType = "general",
  title = null,
  description = null,
  projectId = null,
}) {
  if (!scratchDoc || scratchDoc.zone !== "scratch") {
    const e = new Error("not_scratch_document");
    e.statusCode = 400;
    throw e;
  }
  if (normalizeEmail(scratchDoc.author_email || scratchDoc.created_by_email) !== normalizeEmail(actor.email)) {
    const e = new Error("forbidden");
    e.statusCode = 403;
    throw e;
  }
  if (!scratchDoc.workdrive_file_id) {
    const e = new Error("workdrive_file_missing");
    e.statusCode = 400;
    throw e;
  }
  if (scratchDoc.dump_registered && scratchDoc.registered_managed_id) {
    const e = new Error("already_registered");
    e.statusCode = 409;
    e.detail = "This dump file already has a managed copy. Open the managed document instead.";
    e.managedDocumentId = scratchDoc.registered_managed_id;
    throw e;
  }

  let parentId;
  let resolvedProjectId = null;
  const serviceToken = await getServiceZohoAccessToken(pool);
  const docTypeKey = String(docType || "general").trim() || "general";
  const { rows: typeRows } = await pool.query(
    `select * from doc_type_definitions where doc_type = $1 and active = true`,
    [docTypeKey],
  );
  const docTypeDef = typeRows[0] || null;

  if (projectId) {
    const { rows: projRows } = await pool.query(
      `select id, workdrive_folder_id from projects where id = $1 and active = true`,
      [projectId],
    );
    if (!projRows[0]) {
      const e = new Error("project_not_found");
      e.statusCode = 400;
      throw e;
    }
    resolvedProjectId = projRows[0].id;
    parentId = projRows[0].workdrive_folder_id
      || (await resolveManagedParent(pool, serviceToken, actor));
    if (projRows[0].workdrive_folder_id) {
      const typeFolder = await ensureProjectDocTypeFolder(
        serviceToken,
        projRows[0].workdrive_folder_id,
        docTypeKey,
        docTypeDef,
      );
      parentId = typeFolder.id;
    }
  } else {
    parentId = await resolveManagedParent(pool, serviceToken, actor);
  }

  const userToken = await getZohoAccessToken(pool, actor.email);
  const downloaded = await downloadWorkdriveFile(userToken, scratchDoc.workdrive_file_id);
  const filename =
    title ||
    downloaded.filename ||
    scratchDoc.title ||
    "document.bin";
  const uploaded = await uploadWorkdriveFile(serviceToken, {
    parentId,
    filename,
    buffer: downloaded.buffer,
    contentType: downloaded.contentType,
  });

  const managedId = crypto.randomUUID();
  const author = normalizeEmail(actor.email);
  const ver = initialDraftVersion();
  const finalTitle = title || scratchDoc.title || filename;
  const finalDesc =
    description !== undefined && description !== null
      ? description
      : scratchDoc.description;

  const { rows: managedRows } = await pool.query(
    `
      insert into documents(
        id, workdrive_file_id, workdrive_folder_id, workdrive_permalink,
        doc_type, title, description, state, zone, project_id,
        author_email, created_by_email, modified_by_email,
        workflow_mode, workflow_stage, review_round,
        version, version_label, version_major, version_minor,
        created_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,'draft','managed',$8,
        $9,$9,$9,
        'none', null, 0,
        $10,$11,$12,$13,
        now(), now()
      )
      returning *
    `,
    [
      managedId,
      uploaded.id,
      parentId,
      uploaded.permalink || null,
      docType,
      finalTitle,
      finalDesc ?? null,
      resolvedProjectId,
      author,
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
        version, version_label, version_major, version_minor,
        uploaded_by_email, change_summary
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,'Copied from dump on register')
    `,
    [
      managedId,
      uploaded.id,
      uploaded.permalink || null,
      ver.version,
      ver.label,
      ver.major,
      ver.minor,
      author,
    ],
  );

  const { rows: scratchRows } = await pool.query(
    `
      update documents set
        dump_registered = true,
        registered_managed_id = $2,
        title = coalesce($3, title),
        modified_by_email = $4,
        updated_at = now()
      where id = $1
      returning *
    `,
    [scratchDoc.id, managedId, finalTitle, author],
  );

  try {
    await grantVaultFileAccess(pool, {
      resourceId: uploaded.id,
      email: author,
      permission: "write",
    });
  } catch {
    // non-fatal; managed doc still created
  }

  return {
    scratch: scratchRows[0],
    document: managedRows[0],
    workdrive: uploaded,
  };
}

/** Enrich WorkDrive file items with dump document metadata. */
export async function enrichDumpFiles(pool, files) {
  const ids = (files || []).map((f) => f.id).filter(Boolean);
  if (!ids.length) return files || [];
  const { rows } = await pool.query(
    `
      select id, workdrive_file_id, workdrive_permalink, title, zone,
             dump_registered, registered_managed_id
      from documents
      where workdrive_file_id = any($1::text[])
    `,
    [ids],
  );
  const byWd = new Map(rows.map((r) => [r.workdrive_file_id, r]));
  return files.map((f) => {
    const doc = byWd.get(f.id);
    return {
      ...f,
      documentId: doc?.zone === "scratch" ? doc.id : doc?.id || null,
      registered: Boolean(
        doc?.dump_registered ||
          (doc && doc.zone === "managed") ||
          doc?.registered_managed_id,
      ),
      managedDocumentId:
        doc?.registered_managed_id ||
        (doc?.zone === "managed" ? doc.id : null),
      dumpTitle: doc?.title || null,
      permalink: f.permalink || doc?.workdrive_permalink || null,
    };
  });
}
