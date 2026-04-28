/**
 * Curated CRM screens (comDash sidebar). Keep menu paths in apiGate portal.js in sync (same doctype + path).
 * Unlisted DocTypes → use “Other doctypes” only.
 */
export const CRM_LIST_VIEWS = [
  {
    key: "leads",
    label: "Leads",
    doctype: "Lead",
    listFields: [
      "name",
      "lead_name",
      "status",
      "company_name",
      "email_id",
      "modified",
    ],
  },
  {
    key: "opportunities",
    label: "Opportunities",
    doctype: "Opportunity",
    listFields: [
      "name",
      "party_name",
      "status",
      "opportunity_amount",
      "modified",
    ],
  },
  {
    key: "customers",
    label: "Customers",
    doctype: "Customer",
    listFields: [
      "name",
      "customer_name",
      "customer_type",
      "territory",
      "modified",
    ],
  },
  {
    key: "contacts",
    label: "Contacts",
    doctype: "Contact",
    listFields: [
      "name",
      "first_name",
      "last_name",
      "email_id",
      "modified",
    ],
  },
  {
    key: "quotations",
    label: "Quotations",
    doctype: "Quotation",
    listFields: [
      "name",
      "party_name",
      "status",
      "transaction_date",
      "modified",
    ],
  },
];

export function curatedDocTypeSet() {
  return new Set(CRM_LIST_VIEWS.map((v) => v.doctype));
}

export function getListViewConfig(doctype) {
  return CRM_LIST_VIEWS.find((v) => v.doctype === doctype);
}
