import crypto from "node:crypto";
import { requireJwt, normalizeEmail, isDocAdmin } from "../lib/auth.js";
import { canReadDocument } from "../services/documentAcl.js";
import { getZohoAccessToken } from "../services/zohoAuth.js";

export async function sharesRoutes(app, { pool }) {
  // Helper: Guarantees the table exists AND adds the new folder_name column
  async function ensureFolderSharesTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folder_shares (
        id uuid PRIMARY KEY,
        folder_id text NOT NULL,
        grantee_email text NOT NULL,
        permission text NOT NULL,
        granted_by_email text NOT NULL,
        workdrive_permission_id text,
        created_at timestamp with time zone default now()
      )
    `);
    // Add the folder_name column for tracking real names safely
    await pool.query(`
      ALTER TABLE folder_shares ADD COLUMN IF NOT EXISTS folder_name text DEFAULT 'Shared Folder'
    `);
  }

  // ==========================================
  // DOCUMENT SHARES (PURE POSTGRES)
  // ==========================================
  app.get("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const { rows: docs } = await pool.query("select * from documents where id = $1", [request.params.id]);
      const doc = docs[0];
      
      if (!doc) return reply.code(404).send({ error: "not_found", detail: "Document not found." });
      if (!(await canReadDocument(pool, doc, actor.email, request))) {
        return reply.code(403).send({ error: "forbidden", detail: "Access denied." });
      }
      
      const { rows } = await pool.query(
        "select * from document_shares where document_id = $1 order by created_at desc",
        [doc.id],
      );
      return reply.send({ shares: rows });
    } catch (e) {
      return reply.code(500).send({ error: "server_error", detail: e.message });
    }
  });

  app.post("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    try {
      const actor = requireJwt(request);
      const { rows: docs } = await pool.query("select * from documents where id = $1", [request.params.id]);
      const doc = docs[0];
      
      if (!doc) return reply.code(404).send({ error: "not_found", detail: "Document not found." });

      const owner = normalizeEmail(doc.author_email || doc.created_by_email);
      if (owner !== normalizeEmail(actor.email) && !isDocAdmin(request)) {
        return reply.code(403).send({ error: "forbidden", detail: "Only the owner can share this document." });
      }

      const granteeEmail = request.body?.granteeEmail ? normalizeEmail(request.body.granteeEmail) : null;
      const granteeDepartment = request.body?.granteeDepartment ? String(request.body.granteeDepartment).trim() : null;
      const permission = String(request.body?.permission || "read").trim();

      if (!granteeEmail && !granteeDepartment) {
        return reply.code(400).send({ error: "grantee_required", detail: "Please provide an email to share with." });
      }

      const id = crypto.randomUUID();
      const { rows } = await pool.query(
        `insert into document_shares(
            id, document_id, grantee_email, grantee_department,
            permission, granted_by_email, workdrive_permission_id
          ) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [id, doc.id, granteeEmail, granteeDepartment, permission, normalizeEmail(actor.email), "internal-db-only"],
      );
      
      return reply.send({ ok: true, message: "Shared successfully", share: rows[0] });
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });

  app.delete("/api/v1/docs/documents/:id/shares/:shareId", async (request, reply) => {
    try {
      const actor = requireJwt(request);
      const { rows: docs } = await pool.query("select * from documents where id = $1", [request.params.id]);
      const doc = docs[0];
      
      if (!doc) return reply.code(404).send({ error: "not_found", detail: "Document not found." });

      await pool.query("delete from document_shares where id = $1 and document_id = $2", [
        request.params.shareId,
        doc.id,
      ]);
      
      return reply.send({ ok: true, message: "Share revoked successfully." });
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });

  // ==========================================
  // FOLDER SHARES (PURE POSTGRES)
  // ==========================================
  app.get("/api/v1/docs/scratch/folders/:id/shares", async (request, reply) => {
    requireJwt(request);
    try {
      await ensureFolderSharesTable();
      const { rows } = await pool.query(
        "select * from folder_shares where folder_id = $1 order by created_at desc",
        [request.params.id]
      ); 
      return reply.send({ shares: rows });
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });

  app.post("/api/v1/docs/scratch/folders/:id/shares", async (request, reply) => {
    try {
      const actor = requireJwt(request);
      const folderId = request.params.id; 
      const granteeEmail = request.body?.granteeEmail ? normalizeEmail(request.body.granteeEmail) : null;
      const permission = String(request.body?.permission || "read").trim();

      if (!granteeEmail) {
        return reply.code(400).send({ error: "grantee_required", detail: "Please provide an email to share with." });
      }

      await ensureFolderSharesTable();

      // 1. Fetch the real folder name before saving to DB
      let realFolderName = "Shared Folder";
      try {
        const userToken = await getZohoAccessToken(pool, actor.email);
        const folderRes = await fetch(`https://workdrive.zoho.eu/api/v1/files/${folderId}`, {
          headers: { "Authorization": `Zoho-oauthtoken ${userToken}` }
        });
        if (folderRes.ok) {
          const folderJson = await folderRes.json();
          if (folderJson?.data?.attributes?.name) {
            realFolderName = folderJson.data.attributes.name;
          }
        }
      } catch (err) {
        // Fallback gracefully if Zoho lookup fails
      }

      const id = crypto.randomUUID();
      const { rows } = await pool.query(
        `insert into folder_shares (id, folder_id, grantee_email, permission, granted_by_email, workdrive_permission_id, folder_name)
         values ($1, $2, $3, $4, $5, $6, $7) returning *`,
        [id, folderId, granteeEmail, permission, normalizeEmail(actor.email), "internal-db-only", realFolderName]
      );
      
      return reply.send({ ok: true, message: "Shared successfully", share: rows[0] });
      
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });

  app.delete("/api/v1/docs/scratch/folders/:id/shares/:shareId", async (request, reply) => {
    requireJwt(request);
    try {
      await pool.query("delete from folder_shares where id = $1", [request.params.shareId]);
      return reply.send({ ok: true, message: "Share revoked successfully." });
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });
}