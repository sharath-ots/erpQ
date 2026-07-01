/**
 * Curated supplier-portal screens. Keep menu paths in apiGate portal.js in sync.
 */
export const SUPPLIER_LIST_VIEWS = [
  {
    key: "rfqs",
    label: "Request for Quotation",
    doctype: "Request for Quotation",
    listFields: ["name", "transaction_date", "schedule_date", "status", "company", "modified"],
  },
  {
    key: "supplier-quotations",
    label: "Supplier Quotations",
    doctype: "Supplier Quotation",
    listFields: ["name", "supplier", "status", "transaction_date", "grand_total", "modified"],
  },
  {
    key: "purchase-orders",
    label: "Purchase Orders",
    doctype: "Purchase Order",
    listFields: ["name", "supplier", "status", "transaction_date", "grand_total", "modified"],
  },
  {
    key: "purchase-invoices",
    label: "Purchase Invoices",
    doctype: "Purchase Invoice",
    listFields: ["name", "supplier", "status", "posting_date", "grand_total", "modified"],
  },
];

export function supplierCuratedDocTypeSet() {
  return new Set(SUPPLIER_LIST_VIEWS.map((v) => v.doctype));
}

export function getSupplierListViewConfig(doctype) {
  return SUPPLIER_LIST_VIEWS.find((v) => v.doctype === doctype);
}
