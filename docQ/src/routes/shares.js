import crypto from "node:crypto";
import { requireJwt, normalizeEmail, isDocAdmin, sendError } from "../lib/auth.js";
import { canReadDocument } from "../services/documentAcl.js";
import { getZohoAccessToken } from "../services/zohoAuth.js";
import {
  createWorkdrivePermission,
  deleteWorkdrivePermission,
  workdriveRoleIdForPermission,
} from "../services/workdrive.js";

// =========================================================================
// HELPER: Generate a fresh 1-hour Admin Access Token using the Refresh Token
// =========================================================================
async function getAdminAccessToken() {
  const refreshToken = process.env.AUTHQ_ZOHO_ADMIN_REFRESH_TOKEN;
  const clientId = process.env.AUTHQ_ZOHO_CLIENT_ID;
  const clientSecret = process.env.AUTHQ_ZOHO_CLIENT_SECRET;
  
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Missing Zoho Admin credentials in .env environment variables.");
  }

  const response = await fetch("https://accounts.zoho.eu/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`Failed to generate Admin Access Token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

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
    await pool.query(`
      ALTER TABLE folder_shares ADD COLUMN IF NOT EXISTS folder_name text DEFAULT 'Shared Folder'
    `);
  }

  // ==========================================
  // DOCUMENT SHARES (ZOHO + POSTGRES)
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

      let workdrivePermissionId = "internal-db-only";

      if (granteeEmail && doc.workdrive_file_id) {
        try {
          const token = await getZohoAccessToken(pool, actor.email);
          const created = await createWorkdrivePermission(token, {
            resourceId: doc.workdrive_file_id,
            email: granteeEmail,
            roleId: workdriveRoleIdForPermission(permission),
          });
          workdrivePermissionId = created.id || created.data?.id || "unknown";
        } catch (shareErr) {
          const errMsg = shareErr.response?.data?.errors?.[0]?.title || shareErr.message;
          return reply.code(500).send({ error: "zoho_share_failed", detail: `Zoho Error: ${errMsg}` });
        }
      }

      const id = crypto.randomUUID();
      const { rows } = await pool.query(
        `insert into document_shares(
            id, document_id, grantee_email, grantee_department,
            permission, granted_by_email, workdrive_permission_id
          ) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [id, doc.id, granteeEmail, granteeDepartment, permission, normalizeEmail(actor.email), workdrivePermissionId],
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

      const { rows: shares } = await pool.query("select * from document_shares where id = $1", [request.params.shareId]);
      const share = shares[0];

      if (share && share.workdrive_permission_id && share.workdrive_permission_id !== "internal-db-only") {
        try {
          const token = await getZohoAccessToken(pool, actor.email);
          await deleteWorkdrivePermission(token, share.workdrive_permission_id);
        } catch (err) {
          request.log?.warn("Failed to delete permission from Zoho, but removing from DB anyway.");
        }
      }

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
  // FOLDER SHARES (ZOHO + POSTGRES)
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

      const folderName = request.body?.folderName ? String(request.body.folderName).trim() : "Shared Folder";

      if (!granteeEmail) return reply.code(400).send({ error: "grantee_required", detail: "Please provide an email to share with." });

      let workdrivePermissionId = "internal-db-only";

      try {
        // Automatically fetch the token from DB using the actor's email
        const token = await getZohoAccessToken(pool, actor.email);
        
        const created = await createWorkdrivePermission(token, {
          resourceId: folderId,
          email: granteeEmail,
          roleId: workdriveRoleIdForPermission(permission),
        });
        workdrivePermissionId = created.id || created.data?.id || "unknown";
      } catch (shareErr) {
        const errMsg = shareErr.response?.data?.errors?.[0]?.title || shareErr.message;
        return reply.code(500).send({ error: "zoho_share_failed", detail: `Zoho Error: ${errMsg}` });
      }

      const shareId = crypto.randomUUID();
      await pool.query(
        `insert into folder_shares (id, folder_id, grantee_email, permission, granted_by_email, workdrive_permission_id, folder_name)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [shareId, folderId, granteeEmail, permission, normalizeEmail(actor.email), workdrivePermissionId, folderName]
      );
      
      return reply.send({ ok: true, message: "Folder shared successfully" });
      
    } catch (e) {
      return reply.code(500).send({ error: "server_error", detail: e.message });
    }
  });

  app.delete("/api/v1/docs/scratch/folders/:id/shares/:shareId", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const { rows: shares } = await pool.query("select * from folder_shares where id = $1", [request.params.shareId]);
      const share = shares[0];

      if (share && share.workdrive_permission_id && share.workdrive_permission_id !== "internal-db-only") {
        try {
          const token = await getZohoAccessToken(pool, actor.email);
          await deleteWorkdrivePermission(token, share.workdrive_permission_id);
        } catch (err) {
          request.log?.warn("Failed to delete folder permission from Zoho, but removing from DB anyway.");
        }
      }

      await pool.query("delete from folder_shares where id = $1", [request.params.shareId]);
      return reply.send({ ok: true, message: "Share revoked successfully." });
    } catch (e) {
      return reply.code(500).send({ error: "db_error", detail: e.message });
    }
  });

  // ==========================================
  // BROWSE SHARED FOLDER CONTENTS
  // ==========================================
  app.get("/api/v1/docs/folder-shares/:id/browse", async (request, reply) => {
    const actor = requireJwt(request);
    try {
      const { rows } = await pool.query("select * from folder_shares where id = $1", [request.params.id]);
      const share = rows[0];
      if (!share) return reply.code(404).send({ error: "not_found", detail: "Share not found." });

      const targetFolderId = request.query.folderId || share.folder_id;

      const token = await getZohoAccessToken(pool, actor.email);
      const filesRes = await fetch(`https://workdrive.zoho.eu/api/v1/files/${targetFolderId}/files`, {
        headers: { "Authorization": `Zoho-oauthtoken ${token}` }
      });
      
      if (!filesRes.ok) throw new Error("Could not fetch folder contents from Zoho.");
      const filesJson = await filesRes.json();
      const items = filesJson?.data || [];

      const folders = items.filter(i => i.attributes.is_folder).map(f => ({
        id: f.id,
        name: f.attributes.name,
        type: "folder"
      }));
      
      const files = items.filter(i => !i.attributes.is_folder).map(f => ({
        id: f.id,
        name: f.attributes.name,
        type: "file",
        permalink: f.attributes.permalink
      }));

      return reply.send({ folders, files });
    } catch (e) {
      return reply.code(500).send({ error: "browse_failed", detail: e.message });
    }
  });
}