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
    { key: "desk-home", label: "Desk home", href: `${b}${DESK_PATHS.home}` },
    { key: "desk-purchase", label: "Buying module", href: `${b}${DESK_PATHS.purchase}` },
    { key: "desk-supplier", label: "Suppliers", href: `${b}${DESK_PATHS.supplier}` },
    { key: "desk-po", label: "Purchase Orders", href: `${b}${DESK_PATHS.purchaseOrder}` },
    { key: "desk-pi", label: "Purchase Invoices", href: `${b}${DESK_PATHS.purchaseInvoice}` },
    { key: "desk-item", label: "Items", href: `${b}${DESK_PATHS.item}` },
  ];
}
