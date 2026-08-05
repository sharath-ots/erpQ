/** Canonical Documents sidebar — keep in sync with portal.js / sitemap / FALLBACK_CHILDREN. */
export const DOCQ_BASE_NAV = [
  { key: "docq-my", label: "My documents", path: "/m/docq/my-documents" },
  { key: "docq-new", label: "Create documents", path: "/m/docq/new" },
  { key: "docq-register", label: "All my dump files", path: "/m/docq/register" },
  { key: "docq-shared-with-me", label: "Shared with me", path: "/m/docq/shared-with-me" },
  { key: "docq-shared-by-me", label: "Shared by me", path: "/m/docq/shared-by-me" },
  { key: "docq-changes", label: "Revision", path: "/m/docq/changes-requested" },
  { key: "docq-review", label: "Documents for Review", path: "/m/docq/for-review" },
  { key: "docq-approval", label: "Documents for Approval", path: "/m/docq/for-approval" },
  { key: "docq-revoke", label: "Revoke documents", path: "/m/docq/revoke" },
];

export const DOCQ_ADMIN_NAV = [
  { key: "docq-admin-wf", label: "Workflow (admin)", path: "/m/docq/admin/workflows" },
  { key: "docq-admin-types", label: "Document types (admin)", path: "/m/docq/admin/doc-types" },
  { key: "docq-admin-projects", label: "Projects (admin)", path: "/m/docq/admin/projects" },
];

export function buildDocqNavChildren(isAdmin) {
  if (!isAdmin) return DOCQ_BASE_NAV;
  return [...DOCQ_BASE_NAV, ...DOCQ_ADMIN_NAV];
}
