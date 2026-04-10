/**
 * Curated Purchasing screens (comDash sidebar). Keep menu paths in apiGate portal.js in sync.
 */
export const PUR_LIST_VIEWS = [
  {
    key: "suppliers",
    label: "Suppliers",
    doctype: "Supplier",
    listFields: ["name", "supplier_name", "supplier_type", "country", "modified"],
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
  {
    key: "items",
    label: "Items",
    doctype: "Item",
    listFields: ["name", "item_name", "item_group", "stock_uom", "modified"],
  },
];

export function purCuratedDocTypeSet() {
  return new Set(PUR_LIST_VIEWS.map((v) => v.doctype));
}

export function getPurListViewConfig(doctype) {
  return PUR_LIST_VIEWS.find((v) => v.doctype === doctype);
}
