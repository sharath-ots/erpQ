export function displayStatus(doc) {
  if (!doc) return { label: "—", color: "default" };
  
  // MUI Colors: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
  if (doc.state === "draft") return { label: "Draft — submit for review", color: "warning" };
  if (doc.state === "under_revision") return { label: "Under revision", color: "error" };
  if (doc.state === "changes_requested") return { label: "Sent back — fix & resubmit", color: "warning" };
  if (doc.state === "approved") return { label: "Approved", color: "success" };
  if (doc.state === "archived") return { label: "Archived", color: "default" };
  if (doc.state === "in_review") {
    if (doc.workflow_stage === "approval") return { label: "Reviewed — with approvers", color: "info" };
    if (doc.workflow_stage === "review") return { label: "With reviewers", color: "info" };
    return { label: "In review", color: "info" };
  }
  return { label: String(doc.state || "—"), color: "default" };
}

export function nextActionMeta(action) {
  switch (action) {
    case "submit": return { label: "Submit for review", button: "Submit", color: "primary" };
    case "resubmit": return { label: "Resubmit for review", button: "Resubmit", color: "primary" };
    case "review": return { label: "Complete your review", button: "Review", color: "primary" };
    case "approve": return { label: "Complete your approval", button: "Approve", color: "primary" };
    case "waiting": return { label: "Waiting on others", button: null, color: "default" };
    case "done": return { label: "Approved — no action", button: null, color: "default" };
    default: return { label: "—", button: null, color: "default" };
  }
}

export function showReviewedByColumn(doc) {
  if (!doc) return false;
  if (doc.reviewed_by) return true;
  return (doc.state === "in_review" && doc.workflow_stage === "approval") || doc.state === "approved" || doc.state === "archived";
}

export function showApprovedByColumn(doc) {
  if (!doc) return false;
  if (doc.approved_by) return true;
  return doc.state === "approved" || doc.state === "archived";
}

export function formatDate(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(value); }
}