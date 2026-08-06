/** Document lifecycle states (stored in documents.state). */
export const DOC_STATES = {
  DRAFT: "draft",
  IN_REVIEW: "in_review",
  CHANGES_REQUESTED: "changes_requested",
  APPROVED: "approved",
  ARCHIVED: "archived",
  UNDER_REVISION: "under_revision",
};

/** Active workflow stage (stored in documents.workflow_stage). */
export const WORKFLOW_STAGES = {
  REVIEW: "review",
  APPROVAL: "approval",
};

/** Task roles (stored in workflow_tasks.role). */
export const TASK_ROLES = {
  REVIEWER: "reviewer",
  APPROVER: "approver",
};

/** States where the author owns the document and may edit metadata / upload versions. */
export const AUTHOR_EDIT_STATES = [
  DOC_STATES.DRAFT,
  DOC_STATES.CHANGES_REQUESTED,
  DOC_STATES.UNDER_REVISION,
];
