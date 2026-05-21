import crypto from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function requireJwt(request) {
  const u = request.user;
  if (!u?.email) {
    const e = new Error("unauthorized");
    e.statusCode = 401;
    throw e;
  }
  return u;
}

export async function docsRoutes(app, { pool }) {
  // Register (or update) a WorkDrive file in docQ registry.
  app.post("/api/v1/docs/files/:fileId/register", async (request, reply) => {
    const actor = requireJwt(request);
    const fileId = String(request.params.fileId || "").trim();
    const docType = String(request.body?.docType ?? "").trim();
    const title = request.body?.title ? String(request.body.title).trim() : null;
    const permalink = request.body?.permalink
      ? String(request.body.permalink).trim()
      : null;
    const folderId = request.body?.folderId
      ? String(request.body.folderId).trim()
      : null;

    if (!fileId) return reply.code(400).send({ error: "fileId_required" });
    if (!docType) return reply.code(400).send({ error: "docType_required" });

    const id = crypto.randomUUID();
    const initialState = "draft";

    const { rows } = await pool.query(
      `
        insert into docq_documents(
          id, workdrive_file_id, workdrive_folder_id, workdrive_permalink,
          doc_type, title, state,
          created_by_email, created_at, updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8, now(), now())
        on conflict (workdrive_file_id) do update set
          workdrive_folder_id = excluded.workdrive_folder_id,
          workdrive_permalink = excluded.workdrive_permalink,
          doc_type = excluded.doc_type,
          title = coalesce(excluded.title, docq_documents.title),
          updated_at = now()
        returning *
      `,
      [
        id,
        fileId,
        folderId,
        permalink,
        docType,
        title,
        initialState,
        actor.email,
      ],
    );
    return reply.send({ ok: true, document: rows[0], at: nowIso() });
  });

  app.get("/api/v1/docs/files/:fileId", async (request, reply) => {
    requireJwt(request);
    const fileId = String(request.params.fileId || "").trim();
    if (!fileId) return reply.code(400).send({ error: "fileId_required" });
    const { rows } = await pool.query(
      "select * from docq_documents where workdrive_file_id = $1",
      [fileId],
    );
    if (!rows.length) return reply.code(404).send({ error: "not_registered" });
    return reply.send({ document: rows[0] });
  });

  app.get("/api/v1/docs/documents/:id/history", async (request, reply) => {
    requireJwt(request);
    const id = String(request.params.id || "").trim();
    const { rows } = await pool.query(
      `
        select *
        from docq_transition_history
        where document_id = $1
        order by created_at desc
        limit 200
      `,
      [id],
    );
    return reply.send({ history: rows });
  });

  app.post("/api/v1/docs/documents/:id/erpnext/ref", async (request, reply) => {
    requireJwt(request);
    const id = String(request.params.id || "").trim();
    const erp_doctype = String(request.body?.erp_doctype ?? "").trim();
    const erp_docname = String(request.body?.erp_docname ?? "").trim();
    const fieldname = request.body?.fieldname
      ? String(request.body.fieldname).trim()
      : null;
    const url = String(request.body?.url ?? "").trim();

    if (!id) return reply.code(400).send({ error: "document_id_required" });
    if (!erp_doctype || !erp_docname || !url) {
      return reply.code(400).send({ error: "erp_doctype_erp_docname_url_required" });
    }

    const { rows } = await pool.query(
      `
        insert into docq_erpnext_refs(document_id, erp_doctype, erp_docname, fieldname, url)
        values ($1,$2,$3,$4,$5)
        returning *
      `,
      [id, erp_doctype, erp_docname, fieldname, url],
    );
    return reply.send({ ok: true, ref: rows[0] });
  });
}

