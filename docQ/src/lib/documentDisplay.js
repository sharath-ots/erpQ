import { normalizeEmail } from "./auth.js";

/** @param {object} doc @param {string} actorEmail @param {object|null} pendingTask */
export function computeNextAction(doc, actorEmail, pendingTask) {
  const em = normalizeEmail(actorEmail);
  const author = normalizeEmail(doc.author_email || doc.created_by_email);
  const isAuthor = author === em;

  if (pendingTask) {
    if (pendingTask.role === "reviewer") return "review";
    if (pendingTask.role === "approver") return "approve";
    return "act";
  }
  if (isAuthor && doc.zone === "managed" && doc.state === "draft") return "submit";
  if (isAuthor && doc.state === "under_revision") return "submit";
  if (isAuthor && doc.state === "changes_requested") return "resubmit";
  if (isAuthor && doc.state === "in_review") return "waiting";
  if (isAuthor && doc.state === "approved") return "done";
  return "none";
}

export function workflowBucket(doc) {
  if (!doc) return "other";
  if (doc.state === "draft") return "draft";
  if (doc.state === "under_revision") return "under_revision";
  if (doc.state === "changes_requested") return "changes_requested";
  if (doc.state === "approved") return "approved";
  if (doc.state === "archived") return "archived";
  if (doc.state === "in_review") {
    if (doc.workflow_stage === "approval") return "in_approval";
    if (doc.workflow_stage === "review") return "in_review";
    return "in_review";
  }
  return "other";
}
