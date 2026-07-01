/** Map portal menu keys to Iconify icons for module sidebars. */
const ICONS = {
  dash: "material-symbols:dashboard-outline",
  rfq: "material-symbols:request-quote-outline",
  "submit-quotation": "material-symbols:add-notes-outline",
  sq: "material-symbols:description-outline",
  po: "material-symbols:shopping-cart-outline",
  pi: "material-symbols:receipt-long-outline",
  "upload-invoice": "material-symbols:upload-file-outline",
  other: "material-symbols:folder-open-outline",
  "embed-desk": "material-symbols:open-in-new-rounded",
  "purq-dash": "material-symbols:dashboard-outline",
  "purq-suppliers": "material-symbols:local-shipping-outline",
  "purq-po": "material-symbols:shopping-cart-outline",
  "purq-pi": "material-symbols:receipt-long-outline",
  "purq-items": "material-symbols:inventory-2-outline",
  "purq-other": "material-symbols:folder-open-outline",
  "hrq-dash": "material-symbols:dashboard-outline",
  "hrq-employees": "material-symbols:groups-outline",
  "hrq-departments": "material-symbols:corporate-fare-outline",
  "hrq-leaves": "material-symbols:event-busy-outline",
  "hrq-salary": "material-symbols:payments-outline",
  "hrq-other": "material-symbols:folder-open-outline",
};

const MODULE_PREFIXES = [
  { prefix: "/m/supplierq", rootKeys: ["supplierq-root"], label: "SUPPLIER PORTAL" },
  { prefix: "/m/purq", rootKeys: ["purq-root"], label: "Purchasing" },
  { prefix: "/m/hrq", rootKeys: ["hrq-root"], label: "HR" },
];

/** Fallback when portal menu API has not loaded yet (matches apiGate portal.js). */
const FALLBACK_CHILDREN = {
  "/m/supplierq": [
    { key: "dash", label: "DASHBOARD", path: "/m/supplierq" },
    { key: "rfq", label: "RFQ", path: "/m/supplierq/rfqs" },
    { key: "submit-quotation", label: "SUBMIT QUOTATION", path: "/m/supplierq/quotation/new" },
    { key: "sq", label: "SUPPLIER QUOTATION", path: "/m/supplierq/list/Supplier Quotation" },
    { key: "po", label: "PURCHASE ORDER", path: "/m/supplierq/list/Purchase Order" },
    { key: "pi", label: "PURCHASE INVOICE", path: "/m/supplierq/list/Purchase Invoice" },
    { key: "upload-invoice", label: "UPLOAD INVOICE", path: "/m/supplierq/invoice/upload" },
    { key: "other", label: "OTHER DOCTYPES", path: "/m/supplierq/other" },
  ],
  "/m/purq": [
    { key: "purq-dash", label: "Dashboard", path: "/m/purq" },
    { key: "purq-suppliers", label: "Suppliers", path: "/m/purq/list/Supplier" },
    { key: "purq-po", label: "Purchase Orders", path: "/m/purq/list/Purchase Order" },
    { key: "purq-pi", label: "Purchase Invoices", path: "/m/purq/list/Purchase Invoice" },
    { key: "purq-items", label: "Items", path: "/m/purq/list/Item" },
    { key: "purq-other", label: "Other doctypes", path: "/m/purq/other" },
  ],
  "/m/hrq": [
    { key: "hrq-dash", label: "Dashboard", path: "/m/hrq" },
    { key: "hrq-employees", label: "Employees", path: "/m/hrq/list/Employee" },
    { key: "hrq-departments", label: "Departments", path: "/m/hrq/list/Department" },
    { key: "hrq-leaves", label: "Leave Applications", path: "/m/hrq/list/Leave Application" },
    { key: "hrq-salary", label: "Salary Slips", path: "/m/hrq/list/Salary Slip" },
    { key: "hrq-other", label: "Other doctypes", path: "/m/hrq/other" },
  ],
};

export function isModulePortalRoute(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return MODULE_PREFIXES.some(({ prefix }) => normalized.startsWith(prefix));
}

export function findModulePortalRoot(pathname, menuItems) {
  const normalized = pathname.replace(/\/$/, "") || "/";

  for (const { prefix, rootKeys, label } of MODULE_PREFIXES) {
    if (!normalized.startsWith(prefix)) continue;
    const root = menuItems?.find(
      (m) => rootKeys.includes(m.key) || m.path === prefix,
    );
    if (root) return root;
    return {
      key: rootKeys[0],
      label,
      path: prefix,
      children: FALLBACK_CHILDREN[prefix] ?? [],
    };
  }
  return null;
}

export function portalChildrenToNavItems(children = []) {
  return children.map((child) => ({
    name: child.label,
    key: child.label,
    path: child.path,
    pathName: child.path,
    icon: ICONS[child.key] ?? "material-symbols:chevron-right-rounded",
    active: true,
  }));
}
