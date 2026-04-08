/**
 * URL slug under /m/crmq/:slug → ERPNext DocType name.
 */
export const CRM_ENTITY_SLUG_TO_DOCTYPE = {
  lead: "Lead",
  opportunity: "Opportunity",
  customer: "Customer",
  contact: "Contact",
  quotation: "Quotation",
};

export const CRM_ENTITY_LABELS = {
  lead: "Leads",
  opportunity: "Opportunities",
  customer: "Customers",
  contact: "Contacts",
  quotation: "Quotations",
};

/** @param {string} slug */
export function slugToDoctype(slug) {
  if (!slug) return null;
  const key = slug.toLowerCase();
  return CRM_ENTITY_SLUG_TO_DOCTYPE[key] ?? null;
}

/** @param {string} pathname e.g. /m/crmq/lead */
export function parseCrmqPath(pathname) {
  const m = pathname.match(/^\/m\/crmq(?:\/([^/]+))?$/);
  const slug = m?.[1]?.toLowerCase();
  if (!slug) return { view: "dashboard", slug: null, doctype: null };
  if (slug === "dashboard") return { view: "dashboard", slug, doctype: null };
  const doctype = slugToDoctype(slug);
  if (doctype) return { view: "list", slug, doctype };
  return { view: "unknown", slug, doctype: null };
}
