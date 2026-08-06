import crypto from "node:crypto";
import { requireJwt, normalizeEmail, isDocAdmin, sendError } from "../lib/auth.js";
import { canReadDocument } from "../services/documentAcl.js";
import {
  getServiceZohoAccessToken,
  getZohoAccessToken,
} from "../services/zohoAuth.js";
import {
  createWorkdrivePermission,
  deleteWorkdrivePermission,
  workdriveRoleIdForPermission,
} from "../services/workdrive.js";

async function resolveShareToken(pool, doc, actorEmail) {
  if (doc.zone === "managed") {
    return getServiceZohoAccessToken(pool);
  }
  return getZohoAccessToken(pool, actorEmail);
}

export async function sharesRoutes(app, { pool }) {
  app.get("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    if (!(await canReadDocument(pool, doc, actor.email, request))) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const { rows } = await pool.query(
      "select * from document_shares where document_id = $1 order by created_at desc",
      [doc.id],
    );
    return reply.send({ shares: rows });
  });

  app.post("/api/v1/docs/documents/:id/shares", async (request, reply) => {
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });

    const owner = normalizeEmail(doc.author_email || doc.created_by_email);
    if (
      owner !== normalizeEmail(actor.email) &&
      !isDocAdmin(request)
    ) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const granteeEmail = request.body?.granteeEmail
      ? normalizeEmail(request.body.granteeEmail)
      : null;
    const granteeDepartment = request.body?.granteeDepartment
      ? String(request.body.granteeDepartment).trim()
      : null;
    const permission = String(request.body?.permission || "read").trim();

    if (!granteeEmail && !granteeDepartment) {
      return reply.code(400).send({ error: "grantee_required" });
    }
    if (!["read", "write", "approve"].includes(permission)) {
      return reply.code(400).send({ error: "invalid_permission" });
    }

    let workdrivePermissionId = null;

    // Email shares on a WorkDrive file also set native Zoho permissions.
    // Department-only shares stay docQ-DB only (no Zoho email target).
    if (granteeEmail && doc.workdrive_file_id) {
      try {
        const token = await resolveShareToken(pool, doc, actor.email);
        const created = await createWorkdrivePermission(token, {
          resourceId: doc.workdrive_file_id,
          email: granteeEmail,
          roleId: workdriveRoleIdForPermission(permission),
        });
        workdrivePermissionId = created.id;
      } catch (e) {
        return sendError(reply, e);
      }
    }

    const id = crypto.randomUUID();
    try {
      const { rows } = await pool.query(
        `
          insert into document_shares(
            id, document_id, grantee_email, grantee_department,
            permission, granted_by_email, workdrive_permission_id
          )
          values ($1,$2,$3,$4,$5,$6,$7)
          returning *
        `,
        [
          id,
          doc.id,
          granteeEmail,
          granteeDepartment,
          permission,
          normalizeEmail(actor.email),
          workdrivePermissionId,
        ],
      );
      return reply.send({ ok: true, share: rows[0] });
    } catch (e) {
      // Roll back Zoho permission if DB insert fails.
      if (workdrivePermissionId) {
        try {
          const token = await resolveShareToken(pool, doc, actor.email);
          await deleteWorkdrivePermission(token, workdrivePermissionId);
        } catch {
          // ignore cleanup failure
        }
      }
      return sendError(reply, e);
    }
  });

  app.delete("/api/v1/docs/documents/:id/shares/:shareId", async (request, reply) => {
    const actor = requireJwt(request);
    const { rows: docs } = await pool.query("select * from documents where id = $1", [
      request.params.id,
    ]);
    const doc = docs[0];
    if (!doc) return reply.code(404).send({ error: "not_found" });
    const owner = normalizeEmail(doc.author_email || doc.created_by_email);
    if (owner !== normalizeEmail(actor.email) && !isDocAdmin(request)) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const { rows: shares } = await pool.query(
      "select * from document_shares where id = $1 and document_id = $2",
      [request.params.shareId, doc.id],
    );
    const share = shares[0];
    if (!share) return reply.code(404).send({ error: "not_found" });

    if (share.workdrive_permission_id) {
      try {
        const token = await resolveShareToken(pool, doc, actor.email);
        await deleteWorkdrivePermission(token, share.workdrive_permission_id);
      } catch (err) {
        request.log?.warn?.(
          { err: err?.message, permissionId: share.workdrive_permission_id },
          "workdrive permission delete failed; continuing with DB revoke",
        );
      }
    }

    await pool.query("delete from document_shares where id = $1 and document_id = $2", [
      request.params.shareId,
      doc.id,
    ]);
    return reply.send({ ok: true });
  });
}
