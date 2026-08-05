import crypto from "node:crypto";
import { requireJwt, normalizeEmail, sendError, isDocAdmin } from "../lib/auth.js";
import {
  canReadDocument,
  canAuthorEditMetadata,
} from "../services/documentAcl.js";
import { getOrgUser } from "../services/erpOrgSync.js";
import {
  getServiceZohoAccessToken,
  getZohoAccessToken,
} from "../services/zohoAuth.js";
import {
  uploadWorkdriveFile,
} from "../services/workdrive.js";
import { ensureSharedLibrary } from "../services/sharedLibrary.js";
import { grantVaultFileAccess } from "../services/vaultAccess.js";
import {
  normalizeMetadataInput,
  recordMetadataHistory,
} from "../services/documentMetadata.js";
import { env } from "../config.js";
import { computeNextAction } from "../lib/documentDisplay.js";
import { draftBump, initialDraftVersion } from "../lib/versioning.js";
import { actorCanRevokeDocument } from "../services/workflowEngineV2.js";
import { uploadScratchWithPersonalFolder } from "./scratch.js";
import { registerDumpToManaged } from "../services/dumpRegister.js";

/** Managed library root using the org service Zoho token. */
async function resolveManagedParent(pool, serviceToken, actor) {
  const serviceEmail = env.serviceZohoEmail || actor.email;
  const library = await ensureSharedLibrary(pool, serviceToken, serviceEmail, actor);
  return library.managedFolderId;
}

async function loadDocTypeDef(pool, docType) {
  const { rows } = await pool.query(
    "select * from doc_type_definitions where doc_type = $1 and active = true",
    [docType],
  );
  return rows[0] || null;
}

/** @returns {Promise<{ fields: Record<string, string>, file: { filename: string, mimetype: string, buffer: Buffer } | null }>} */
async function parseMultipartRequest(request) {
  const fields = {};
  /** @type {{ filename: string, mimetype: string, buffer: Buffer } | null} */
  let file = null;
  for await (const part of request.parts()) {
    if (part.type === "file") {
      const chunks = [];
      for await (const chunk of part.file) chunks.push(chunk);
      file = {
        filename: part.filename || "upload.bin",
        mimetype: part.mimetype || "application/octet-stream",
        buffer: Buffer.concat(chunks),
      };
    } else if (part.fieldname) {
      fields[part.fieldname] = part.value;
    }
  }
  return { fields, file };
}

function parseTagsField(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function parseCustomMetadataField(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function getDocument(pool, id) {
  const { rows } = await pool.query("select * from documents where id = $1", [id]);
  return rows[0] || null;
}

export async function documentsListRoutes(app, { pool }) {
  app.get("/api/v1/docs/documents", async (request, reply) => {
    const actor = requireJwt(request);
    const zone = request.query?.zone ? String(request.query.zone) : null;
    const state = request.query?.state ? String(request.query.state) : null;
    const docType = request.query?.docType ? String(request.query.docType) : null;
    const view = request.query?.view ? String(request.query.view) : null;
    const q = request.query?.q ? String(request.query.q).trim() : "";
    const mine = request.query?.mine === "1" || request.query?.mine === "true";
    const limit = Math.min(Number(request.query?.limit) || 50, 200);
    const offset = Number(request.query?.offset) || 0;

    const params = [normalizeEmail(actor.email)];
    let where = "where 1=1";

    if (view === "my") {
      where += ` and d.zone = 'managed' and (d.author_email = $1 or d.created_by_email = $1)`;
    } else if (view === "my_draft") {
      where += ` and d.zone = 'managed' and d.state = 'draft' and (d.author_email = $1 or d.created_by_email = $1)`;
    } else if (view === "my_waiting") {
      where += ` and d.zone = 'managed' and d.state = 'in_review' and (d.author_email = $1 or d.created_by_email = $1)`;
    } else if (view === "my_approved") {
      where += ` and d.zone = 'managed' and d.state = 'approved' and (d.author_email = $1 or d.created_by_email = $1)`;
    } else if (view === "changes_requested") {
      where += ` and d.state = 'changes_requested' and (d.author_email = $1 or d.created_by_email = $1)`;
    } else if (view === "for_review") {
      where += ` and d.id in (
        select document_id from workflow_tasks
        where assignee_email = $1 and status = 'pending' and role = 'reviewer'
      )`;
    } else if (view === "for_approval") {
      where += ` and d.id in (
        select document_id from workflow_tasks
        where assignee_email = $1 and status = 'pending' and role = 'approver'
      )`;
    } else if (view === "archived") {
      where += ` and d.state = 'archived'`;
    } else if (view === "shared_by_me") {
      where += ` and d.id in (
        select document_id from document_shares where granted_by_email = $1
      )`;
    } else if (view === "shared_with_me") {
      where += ` and d.id in (
        select document_id from document_shares
        where grantee_email = $1 and (expires_at is null or expires_at > now())
      )`;
    } else if (view === "revocable") {
      where += ` and d.zone = 'managed' and d.state = 'approved'`;
    } else if (zone) {
      params.push(zone);
      where += ` and d.zone = $${params.length}`;
    } else if (!view) {
      where += ` and d.zone = 'managed'`;
    }

    if (state) {
      params.push(state);
      where += ` and d.state = $${params.length}`;
    }
    if (docType) {
      params.push(docType);
      where += ` and d.doc_type = $${params.length}`;
    }
    if (mine) {
      where += ` and (d.author_email = $1 or d.created_by_email = $1)`;
    }
    if (q) {
      params.push(q);
      where += ` and d.search_vector @@ plainto_tsquery('english', $${params.length})`;
    }

    if (!isDocAdmin(request)) {
      where += `
        and (
          d.author_email = $1 or d.created_by_email = $1
          or d.current_approver_email = $1
          or d.id in (
            select document_id from workflow_tasks
            where assignee_email = $1
          )
          or d.id in (
            select document_id from document_shares
            where grantee_email = $1
              and (expires_at is null or expires_at > now())
          )
          or (d.zone = 'managed' and d.state = 'approved')
        )
      `;
      if (zone === "scratch" || view === "scratch") {
        where += ` and (d.author_email = $1 or d.created_by_email = $1 or d.id in (
          select document_id from document_shares where grantee_email = $1
        ))`;
      }
    }

    params.push(limit, offset);
    const { rows } = await pool.query(
      `
        select d.*,
          coalesce(v.versions, '[]'::json) as versions,
          rev.reviewed_by,
          app.approved_by,
          coalesce(rp.open_review_points, 0) as open_review_points
        from documents d
        left join lateral (
          select json_agg(json_build_object(
            'id', dv.id,
            'version', dv.version,
            'version_label', dv.version_label,
            'version_major', dv.version_major,
            'version_minor', dv.version_minor,
            'is_historical', dv.is_historical,
            'workdrive_permalink', dv.workdrive_permalink
          ) order by dv.version_major desc, dv.version_minor desc, dv.version desc) as versions
          from document_versions dv
          where dv.document_id = d.id
        ) v on true
        left join lateral (
          select string_agg(distinct wt.completed_by_email, ', ' order by wt.completed_by_email) as reviewed_by
          from workflow_tasks wt
          where wt.document_id = d.id
            and wt.role = 'reviewer'
            and wt.status = 'completed'
            and wt.decision = 'approved'
        ) rev on true
        left join lateral (
          select string_agg(distinct wt.completed_by_email, ', ' order by wt.completed_by_email) as approved_by
          from workflow_tasks wt
          where wt.document_id = d.id
            and wt.role = 'approver'
            and wt.status = 'completed'
            and wt.decision = 'approved'
        ) app on true
        left join lateral (
          select count(*)::int as open_review_points
          from review_points rp
          where rp.document_id = d.id and rp.status = 'open'
        ) rp on true
        ${where}
        order by d.updated_at desc
        limit $${params.length - 1} offset $${params.length}
      `,
      params,
    );

    const em = normalizeEmail(actor.email);
    const docIds = rows.map((r) => r.id);
    let taskByDoc = {};
    if (docIds.length) {
      const { rows: myTasks } = await pool.query(
        `
          select document_id, role, stage_id, id
          from workflow_tasks
          where assignee_email = $1 and status = 'pending' and document_id = any($2::uuid[])
        `,
        [em, docIds],
      );
      taskByDoc = Object.fromEntries(myTasks.map((t) => [t.document_id, t]));
    }

    let documents = rows.map((doc) => {
      const isAuthor =
        normalizeEmail(doc.author_email || doc.created_by_email) === em;
      const pendingTask = taskByDoc[doc.id] || null;
      return {
        ...doc,
        is_author: isAuthor,
        next_action: computeNextAction(doc, em, pendingTask),
        my_pending_task: pendingTask,
      };
    });

    if (view === "revocable") {
      const filtered = [];
      for (const doc of documents) {
        if (await actorCanRevokeDocument(pool, doc, actor.email, request)) {
          filtered.push({ ...doc, can_revoke: true });
        }
      }
      documents = filtered;
    }

    return reply.send({ documents, limit, offset });
  });

  app.get("/api/v1/docs/documents/:id", async (request, reply) => {
    const actor = requireJwt(request);
    const doc = await getDocument(pool, request.params.id);
    if (!doc) return reply.code(404).send({ error: "not_found" });
    const canRead = await canReadDocument(pool, doc, actor.email, request);
    const canRevokeEarly = await actorCanRevokeDocument(
      pool,
      doc,
      actor.email,
      request,
    );
    if (!canRead && !canRevokeEarly) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const [history, tasks, chain, shares, comments, versions, refs, reviewPoints, wfInstance, wfTasks, metaHistory, historySnapshots] =
      await Promise.all([
        pool.query(
          "select * from transition_history where document_id = $1 order by created_at desc limit 100",
          [doc.id],
        ),
        pool.query(
          "select * from approval_tasks where document_id = $1 order by step_order asc",
          [doc.id],
        ),
        pool.query("select * from approval_chains where document_id = $1", [doc.id]),
        pool.query("select * from document_shares where document_id = $1", [doc.id]),
        pool.query(
          "select * from review_comments where document_id = $1 order by created_at desc",
          [doc.id],
        ),
        pool.query(
          `select * from document_versions
           where document_id = $1
           order by version_major desc, version_minor desc, version desc`,
          [doc.id],
        ),
        pool.query("select * from erpnext_refs where document_id = $1", [doc.id]),
        pool.query(
          "select * from review_points where document_id = $1 order by round desc, created_at desc",
          [doc.id],
        ),
        pool.query("select * from workflow_instances where document_id = $1", [doc.id]),
        pool.query(
          "select * from workflow_tasks where document_id = $1 order by stage_id, step_order asc",
          [doc.id],
        ),
        pool.query(
          "select * from document_metadata_history where document_id = $1 order by created_at desc limit 50",
          [doc.id],
        ),
        pool.query(
          `select id, version_label, version_major, version_minor, state_at_snapshot,
                  stamped_by_email, stamped_at, workdrive_permalink
           from document_history_snapshots
           where document_id = $1
           order by stamped_at desc`,
          [doc.id],
        ),
      ]);

    const authorCanEdit = canAuthorEditMetadata(doc, actor.email, request);
    const canRevoke = canRevokeEarly;

    const { rows: pendingForUser } = await pool.query(
      `
        select * from workflow_tasks
        where document_id = $1 and assignee_email = $2 and status = 'pending'
        order by created_at asc
        limit 1
      `,
      [doc.id, normalizeEmail(actor.email)],
    );

    return reply.send({
      document: doc,
      authorCanEdit,
      canRevoke,
      currentUserPendingTask: pendingForUser[0] || null,
      history: history.rows,
      approvalTasks: tasks.rows,
      approvalChain: chain.rows[0] || null,
      workflowInstance: wfInstance.rows[0] || null,
      workflowTasks: wfTasks.rows,
      reviewPoints: reviewPoints.rows,
      shares: shares.rows,
      reviewComments: comments.rows,
      versions: versions.rows,
      historySnapshots: historySnapshots.rows,
      metadataHistory: metaHistory.rows,
      erpnextRefs: refs.rows,
    });
  });

  app.get("/api/v1/docs/documents/:id/history/:versionLabel", async (request, reply) => {
    const actor = requireJwt(request);
    const doc = await getDocument(pool, request.params.id);
    if (!doc) return reply.code(404).send({ error: "not_found" });
    const canRead = await canReadDocument(pool, doc, actor.email, request);
    const canRevoke = await actorCanRevokeDocument(pool, doc, actor.email, request);
    if (!canRead && !canRevoke) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const versionLabel = String(request.params.versionLabel || "").trim();
    if (!versionLabel) {
      return reply.code(400).send({ error: "version_label_required" });
    }
    const { rows } = await pool.query(
      `
        select * from document_history_snapshots
        where document_id = $1 and version_label = $2
        limit 1
      `,
      [doc.id, versionLabel],
    );
    if (!rows[0]) return reply.code(404).send({ error: "snapshot_not_found" });
    return reply.send({ ok: true, snapshot: rows[0] });
  });

  /** Create managed document: file upload + metadata in one step (Phase 1). */
  app.post("/api/v1/docs/documents/create-managed", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const { fields, file } = await parseMultipartRequest(request);
      if (!file?.buffer?.length) {
        return reply.code(400).send({ error: "file_required" });
      }

      const docType = String(fields.docType || fields.doc_type || "general").trim();
      const docTypeDef = await loadDocTypeDef(pool, docType);
      const meta = normalizeMetadataInput(
        {
          title: fields.title || file.filename,
          description: fields.description,
          docType,
          department: fields.department,
          classification: fields.classification,
          referenceNumber: fields.referenceNumber || fields.reference_number,
          tags: parseTagsField(fields.tags),
          customMetadata: parseCustomMetadataField(fields.customMetadata || fields.custom_metadata),
        },
        docTypeDef,
      );

      const org = await getOrgUser(pool, actor.email);
      const serviceToken = await getServiceZohoAccessToken(pool);

      let parentId = await resolveManagedParent(pool, serviceToken, actor);
      let projectId = null;
      const projectField = String(fields.projectId || fields.project_id || "").trim();
      if (projectField) {
        const { rows: projRows } = await pool.query(
          `select id, workdrive_folder_id from projects where id = $1 and active = true`,
          [projectField],
        );
        if (!projRows[0]) {
          return reply.code(400).send({ error: "project_not_found" });
        }
        projectId = projRows[0].id;
        if (projRows[0].workdrive_folder_id) {
          parentId = projRows[0].workdrive_folder_id;
        }
      }

      const uploaded = await uploadWorkdriveFile(serviceToken, {
        parentId,
        filename: file.filename,
        buffer: file.buffer,
        contentType: file.mimetype,
      });

      const id = crypto.randomUUID();
      const author = normalizeEmail(actor.email);
      const department = meta.department ?? org?.department ?? null;
      const ver = initialDraftVersion();

      const { rows } = await pool.query(
        `
          insert into documents(
            id, workdrive_file_id, workdrive_folder_id, workdrive_permalink,
            doc_type, title, description, state, zone, project_id,
            author_email, department, classification, reference_number, tags, custom_metadata,
            created_by_email, modified_by_email,
            workflow_mode, workflow_stage, review_round,
            version, version_label, version_major, version_minor,
            created_at, updated_at
          )
          values (
            $1,$2,$3,$4,$5,$6,$7,'draft','managed',$18,
            $8,$9,$10,$11,$12,$13,
            $8,$8,
            'none', null, 0,
            $14,$15,$16,$17,
            now(), now()
          )
          returning *
        `,
        [
          id,
          uploaded.id,
          parentId,
          uploaded.permalink,
          meta.doc_type || docType,
          meta.title || file.filename,
          meta.description ?? null,
          author,
          department,
          meta.classification ?? null,
          meta.reference_number ?? null,
          JSON.stringify(meta.tags || []),
          JSON.stringify(meta.custom_metadata || {}),
          ver.version,
          ver.label,
          ver.major,
          ver.minor,
          projectId,
        ],
      );

      await pool.query(
        `
          insert into document_versions(
            document_id, workdrive_file_id, workdrive_permalink,
            version, version_label, version_major, version_minor,
            uploaded_by_email, change_summary
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,'Initial version')
        `,
        [
          id,
          uploaded.id,
          uploaded.permalink || null,
          ver.version,
          ver.label,
          ver.major,
          ver.minor,
          author,
        ],
      );

      // Vault: author is not a Team Folder member — grant personal Edit on this file only.
      try {
        await grantVaultFileAccess(pool, {
          resourceId: uploaded.id,
          email: author,
          permission: "write",
        });
      } catch (grantErr) {
        request.log?.warn?.(
          { err: grantErr?.message, fileId: uploaded.id, author },
          "vault author grant failed after create-managed",
        );
      }

      return reply.send({ ok: true, document: rows[0], workdrive: uploaded });
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/api/v1/docs/documents", async (request, reply) => {
    const actor = requireJwt(request);
    const body = request.body || {};
    const zone = String(body.zone || "managed");
    const docType = String(body.docType || "general").trim();
    const title = body.title ? String(body.title).trim() : null;
    const description = body.description ? String(body.description).trim() : null;
    const workdriveFileId = body.workdriveFileId
      ? String(body.workdriveFileId).trim()
      : null;
    const permalink = body.permalink ? String(body.permalink).trim() : null;
    const folderId = body.folderId ? String(body.folderId).trim() : null;

    if (!workdriveFileId) {
      return reply.code(400).send({ error: "workdriveFileId_required" });
    }

    const org = await getOrgUser(pool, actor.email);
    const id = crypto.randomUUID();
    const ver = initialDraftVersion();

    const { rows } = await pool.query(
      `
        insert into documents(
          id, workdrive_file_id, workdrive_folder_id, workdrive_permalink,
          doc_type, title, description, state, zone,
          author_email, department, created_by_email, modified_by_email,
          workflow_mode, version, version_label, version_major, version_minor,
          created_at, updated_at
        )
        values (
          $1,$2,$3,$4,$5,$6,$7,'draft',$8,
          $9,$10,$9,$9,'none',$11,$12,$13,$14, now(), now()
        )
        returning *
      `,
      [
        id,
        workdriveFileId,
        folderId,
        permalink,
        docType,
        title,
        description,
        zone,
        normalizeEmail(actor.email),
        org?.department || null,
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
        values ($1,$2,$3,$4,$5,$6,$7,$8,'Initial version')
      `,
      [
        id,
        workdriveFileId,
        permalink || null,
        ver.version,
        ver.label,
        ver.major,
        ver.minor,
        normalizeEmail(actor.email),
      ],
    );

    return reply.send({ ok: true, document: rows[0] });
  });

  /**
   * Register dump → managed: copy file into vault; dump file stays;
   * scratch row flagged dump_registered (does not convert zone).
   */
  app.post("/api/v1/docs/documents/:id/promote", async (request, reply) => {
    const actor = requireJwt(request);
    const doc = await getDocument(pool, request.params.id);
    if (!doc) return reply.code(404).send({ error: "not_found" });

    const docType = String(request.body?.docType || "general").trim();
    const title = request.body?.title ? String(request.body.title).trim() : doc.title;
    const description = request.body?.description
      ? String(request.body.description).trim()
      : doc.description;
    const projectId = request.body?.projectId
      ? String(request.body.projectId).trim()
      : null;

    try {
      const result = await registerDumpToManaged(pool, actor, {
        scratchDoc: doc,
        docType,
        title,
        description,
        projectId,
      });
      return reply.send({
        ok: true,
        document: result.document,
        scratch: result.scratch,
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

  /** Dump upload → personal My Folders only (optional folderId field). Never team Temp_Folder. */
  app.post("/api/v1/docs/scratch/upload", async (request, reply) => {
    return uploadScratchWithPersonalFolder(pool, request, reply);
  });

  app.patch("/api/v1/docs/documents/:id", async (request, reply) => {
    const actor = requireJwt(request);
    const doc = await getDocument(pool, request.params.id);
    if (!doc) return reply.code(404).send({ error: "not_found" });
    if (!canAuthorEditMetadata(doc, actor.email, request)) {
      return reply.code(403).send({
        error: "forbidden",
        detail:
          "Metadata can only be edited by the author while the document is draft, under revision, or sent back for changes.",
      });
    }

    const docTypeDef = await loadDocTypeDef(pool, doc.doc_type);
    let meta;
    try {
      meta = normalizeMetadataInput(request.body || {}, docTypeDef);
    } catch (e) {
      return sendError(reply, e);
    }

    const fieldMap = {
      title: "title",
      description: "description",
      doc_type: "doc_type",
      department: "department",
      classification: "classification",
      reference_number: "reference_number",
      tags: "tags",
      custom_metadata: "custom_metadata",
    };

    const updates = [];
    const values = [doc.id];
    const after = { ...doc };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (meta[key] === undefined) continue;
      const val = key === "tags" || key === "custom_metadata" ? JSON.stringify(meta[key]) : meta[key];
      values.push(val);
      updates.push(`${col} = $${values.length}`);
      after[col] = key === "tags" || key === "custom_metadata" ? meta[key] : val;
    }

    if (!updates.length) {
      return reply.code(400).send({ error: "no_fields_to_update" });
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      values.push(normalizeEmail(actor.email));
      updates.push(`modified_by_email = $${values.length}`);
      updates.push("updated_at = now()");

      const { rows } = await client.query(
        `update documents set ${updates.join(", ")} where id = $1 returning *`,
        values,
      );
      await recordMetadataHistory(client, {
        documentId: doc.id,
        before: doc,
        after: rows[0],
        actorEmail: actor.email,
      });
      await client.query("commit");
      return reply.send({ ok: true, document: rows[0] });
    } catch (e) {
      await client.query("rollback");
      return sendError(reply, e);
    } finally {
      client.release();
    }
  });

  app.post("/api/v1/docs/documents/:id/versions", async (request, reply) => {
    const actor = requireJwt(request);
    const doc = await getDocument(pool, request.params.id);
    if (!doc) return reply.code(404).send({ error: "not_found" });
    if (!canAuthorEditMetadata(doc, actor.email, request)) {
      return reply.code(403).send({
        error: "forbidden",
        detail:
          "New versions can only be uploaded by the author while the document is draft, under revision, or sent back for changes.",
      });
    }

    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "file_required" });
    const chunks = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    try {
      const useService = doc.zone === "managed";
      const accessToken = useService
        ? await getServiceZohoAccessToken(pool)
        : await getZohoAccessToken(pool, actor.email);
      let parentId = doc.workdrive_folder_id || env.managedRootFolderId;
      if (useService && !parentId) {
        parentId = await resolveManagedParent(pool, accessToken, actor);
      }
      if (!parentId) {
        return reply.code(412).send({
          error: "parent_folder_required",
          detail: "No WorkDrive folder for this document.",
        });
      }
      const uploaded = await uploadWorkdriveFile(accessToken, {
        parentId,
        filename: data.filename || "version.bin",
        buffer,
        contentType: data.mimetype,
      });
      const next = draftBump(doc);

      await pool.query(
        `
          update documents set
            workdrive_file_id = $2,
            workdrive_permalink = $3,
            version = $4,
            version_label = $5,
            version_major = $6,
            version_minor = $7,
            modified_by_email = $8,
            updated_at = now()
          where id = $1
        `,
        [
          doc.id,
          uploaded.id,
          uploaded.permalink,
          next.version,
          next.label,
          next.major,
          next.minor,
          normalizeEmail(actor.email),
        ],
      );
      await pool.query(
        `
          insert into document_versions(
            document_id, workdrive_file_id, workdrive_permalink,
            version, version_label, version_major, version_minor,
            uploaded_by_email, change_summary
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          doc.id,
          uploaded.id,
          uploaded.permalink || null,
          next.version,
          next.label,
          next.major,
          next.minor,
          normalizeEmail(actor.email),
          "New version",
        ],
      );
      const { rows } = await pool.query("select * from documents where id = $1", [doc.id]);
      return reply.send({ ok: true, document: rows[0] });
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
