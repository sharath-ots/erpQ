import { DESK_PATHS } from "../constants/deskPaths.js";

export function joinDeskUrl(baseUrl, path) {
  const b = (baseUrl ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!b) return p;
  return `${b}${p}`;
}

/**
 * Appends a query string to a desk URL (handles existing ? in path or base).
 * @param {string} [query] - e.g. "full_page=1" or "full_page=1&sidebar=0" (no leading ?)
 */
export function joinDeskUrlWithQuery(baseUrl, path, query) {
  const base = joinDeskUrl(baseUrl, path);
  const q = String(query ?? "")
    .trim()
    .replace(/^\?/, "");
  if (!q) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${q}`;
}

/** @param {string} deskBase */
export function deskQuickLinks(deskBase) {
  if (!deskBase?.trim()) return [];
  const b = deskBase.replace(/\/$/, "");
  return [
    { key: "desk-home", label: "Desk home", href: `${b}${DESK_PATHS.home}` },
    { key: "desk-crm", label: "CRM module", href: `${b}${DESK_PATHS.crm}` },
    { key: "desk-lead", label: "Leads", href: `${b}${DESK_PATHS.lead}` },
    {
      key: "desk-opp",
      label: "Opportunities",
      href: `${b}${DESK_PATHS.opportunity}`,
    },
    { key: "desk-cust", label: "Customers", href: `${b}${DESK_PATHS.customer}` },
    { key: "desk-contact", label: "Contacts", href: `${b}${DESK_PATHS.contact}` },
    {
      key: "desk-quote",
      label: "Quotations",
      href: `${b}${DESK_PATHS.quotation}`,
    },
  ];
}
