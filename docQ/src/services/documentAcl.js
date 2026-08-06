import { normalizeEmail, isDocAdmin } from "../lib/auth.js";
import { canAuthorEditDocument } from "./documentMetadata.js";

/**
 * @param {import("pg").Pool} pool
 * @param {object} doc - documents row
 * @param {string} actorEmail
 * @param {object} [request] - fastify request for admin check
 */
export async function canReadDocument(pool, doc, actorEmail, request) {
  const em = normalizeEmail(actorEmail);
  if (!em || !doc) return false;
  if (isDocAdmin(request)) return true;

  const owner = normalizeEmail(doc.author_email || doc.created_by_email);
  if (owner === em) return true;
  if (normalizeEmail(doc.current_approver_email) === em) return true;

  const { rows: wfTasks } = await pool.query(
    `
      select 1 from workflow_tasks
      where document_id = $1 and assignee_email = $2 and status = 'pending'
      limit 1
    `,
    [doc.id, em],
  );
  if (wfTasks.length) return true;

  const { rows: legacyTasks } = await pool.query(
    `
      select permission from document_shares
      where document_id = $1
        and (grantee_email = $2 or grantee_department = $3)
        and (expires_at is null or expires_at > now())
    `,
    [doc.id, em, doc.department],
  );
  if (legacyTasks.length) return true;

  if (doc.zone === "scratch") return false;

  if (doc.zone === "managed" && doc.state === "approved") {
    const { rows: deptShare } = await pool.query(
      `
        select 1 from document_shares
        where document_id = $1 and grantee_department is not null
        and (expires_at is null or expires_at > now())
        limit 1
      `,
      [doc.id],
    );
    if (deptShare.length) return true;
  }

  return false;
}

export async function canWriteDocument(pool, doc, actorEmail, request) {
  if (isDocAdmin(request)) return true;
  if (canAuthorEditDocument(doc, actorEmail)) return true;

  const em = normalizeEmail(actorEmail);
  if (!(await canReadDocument(pool, doc, em, request))) return false;

  const { rows } = await pool.query(
    `
      select permission from document_shares
      where document_id = $1 and grantee_email = $2
        and permission in ('write', 'approve')
        and (expires_at is null or expires_at > now())
    `,
    [doc.id, em],
  );
  return rows.length > 0;
}

/** Metadata + file version edits: author only when document is with them.
 * Approved/archived documents are locked for everyone (including admins). */
export function canAuthorEditMetadata(doc, actorEmail, request) {
  if (doc && (doc.state === "approved" || doc.state === "archived")) return false;
  if (isDocAdmin(request)) return true;
  return canAuthorEditDocument(doc, actorEmail);
}

export async function isCurrentApprover(pool, doc, actorEmail) {
  const em = normalizeEmail(actorEmail);
  if (normalizeEmail(doc.current_approver_email) === em) return true;
  const { rows: wfTasks } = await pool.query(
    `
      select 1 from workflow_tasks
      where document_id = $1 and assignee_email = $2 and status = 'pending'
      limit 1
    `,
    [doc.id, em],
  );
  if (wfTasks.length) return true;
  const { rows } = await pool.query(
    `
      select 1 from approval_tasks
      where document_id = $1 and assignee_email = $2 and status = 'pending'
      limit 1
    `,
    [doc.id, em],
  );
  return rows.length > 0;
}
