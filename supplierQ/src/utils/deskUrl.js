import { DESK_PATHS } from "../constants/deskPaths.js";

export function joinDeskUrl(baseUrl, path) {
  const b = (baseUrl ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!b) return p;
  return `${b}${p}`;
}

export function joinDeskUrlWithQuery(baseUrl, path, query) {
  const base = joinDeskUrl(baseUrl, path);
  const q = String(query ?? "").trim().replace(/^\?/, "");
  if (!q) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${q}`;
}

export function deskQuickLinks(deskBase) {
  if (!deskBase?.trim()) return [];
  const b = deskBase.replace(/\/$/, "");
  return [
    { key: "desk-rfq", label: "RFQs", href: `${b}${DESK_PATHS.rfq}` },
    { key: "desk-sq", label: "Supplier Quotations", href: `${b}${DESK_PATHS.supplierQuotation}` },
    { key: "desk-po", label: "Purchase Orders", href: `${b}${DESK_PATHS.purchaseOrder}` },
    { key: "desk-pi", label: "Purchase Invoices", href: `${b}${DESK_PATHS.purchaseInvoice}` },
  ];
}
