import { getCoreModulesCached } from "../services/coreSettings.js";
import { env } from "../config.js";

/** Maps an ERPNext desk path (e.g. `/app/lead`) to the portal route that embeds it in an iframe. */
export function portalPathForDeskIframe(deskPath) {
  const p = String(deskPath ?? "")
    .replace(/^\//, "")
    .replace(/\/+$/, "");
  return p ? `/m/crmq/iframe/${p}` : "/m/crmq/iframe/app";
}

function deskBase() {
  const u = env.erpnextUrl?.trim();
  if (!u) return "";
  return u.replace(/\/$/, "");
}

function deskPublicBase() {
  const u = env.erpnextPublicUrl?.trim();
  return u ? u.replace(/\/$/, "") : "";
}

/**
 * HR sidebar. Paths must match hrQ HrqShell + hrListViews.js.
 */
function buildHrMenuChildren() {
  return [
    { key: "hrq-dash", label: "Dashboard", path: "/m/hrq" },
    { key: "hrq-employees", label: "Employees", path: "/m/hrq/list/Employee" },
    { key: "hrq-departments", label: "Departments", path: "/m/hrq/list/Department" },
    { key: "hrq-leaves", label: "Leave Applications", path: "/m/hrq/list/Leave Application" },
    { key: "hrq-salary", label: "Salary Slips", path: "/m/hrq/list/Salary Slip" },
    { key: "hrq-other", label: "Other doctypes", path: "/m/hrq/other" },
  ];
}

/**
 * Purchasing sidebar. Paths must match purQ PurqShell + purListViews.js.
 */
function buildPurMenuChildren() {
  return [
    { key: "purq-dash", label: "Dashboard", path: "/m/purq" },
    { key: "purq-suppliers", label: "Suppliers", path: "/m/purq/list/Supplier" },
    { key: "purq-po", label: "Purchase Orders", path: "/m/purq/list/Purchase Order" },
    { key: "purq-pi", label: "Purchase Invoices", path: "/m/purq/list/Purchase Invoice" },
    { key: "purq-items", label: "Items", path: "/m/purq/list/Item" },
    { key: "purq-other", label: "Other doctypes", path: "/m/purq/other" },
  ];
}

/**
 * Supplier portal sidebar. Paths must match supplierQ SupplierqShell + supplierListViews.js.
 */
function portalPathForSupplierDeskIframe(deskPath) {
  const p = String(deskPath ?? "")
    .replace(/^\//, "")
    .replace(/\/+$/, "");
  return p ? `/m/supplierq/iframe/${p}` : "/m/supplierq/iframe/app";
}

function buildSupplierMenuChildren() {
  return [
    { key: "dash", label: "DASHBOARD", path: "/m/supplierq" },
    { key: "rfq", label: "RFQ", path: "/m/supplierq/rfqs" },
    // { key: "submit-quotation", label: "SUBMIT QUOTATION", path: "/m/supplierq/quotation/new" },
    // { key: "edit-quotation", label: "EDIT QUOTATION", path: "/m/supplierq/quotation/edit" },
    {
      key: "sq",
      label: "SUPPLIER QUOTATION",
      path: "/m/supplierq/list/supplier-quotation",
    },
    {
      key: "po",
      label: "PURCHASE ORDER",
      path: "/m/supplierq/list/purchase-order",
    },
    {
      key: "pi",
      label: "PURCHASE INVOICE",
      path: "/m/supplierq/list/purchase-invoice",
    },
    { key: "upload-invoice", label: "UPLOAD INVOICE", path: "/m/supplierq/invoice/upload" },
    // { key: "other", label: "OTHER DOCTYPES", path: "/m/supplierq/other" },
    // {
    //   key: "embed-desk",
    //   label: "ERPNEXT DESK",
    //   path: portalPathForSupplierDeskIframe("/app"),
    // },
  ];
}

/**
 * CRM sidebar (comDash is the only nav). Paths must match crmQ CrmqShell + crmListViews.js.
 */
function buildCrmMenuChildren() {
  return [
    { key: "crmq-dash", label: "Dashboard", path: "/m/crmq" },
    { key: "crmq-lead", label: "Leads", path: "/m/crmq/list/Lead" },
    { key: "crmq-add-lead", label: "Add Lead", path: "/m/crmq/add-lead" },
    {
      key: "crmq-opp",
      label: "Opportunities",
      path: "/m/crmq/list/Opportunity",
    },
    { key: "crmq-cust", label: "Customers", path: "/m/crmq/list/Customer" },
    { key: "crmq-contact", label: "Contacts", path: "/m/crmq/list/Contact" },
    {
      key: "crmq-quote",
      label: "Quotations",
      path: "/m/crmq/list/Quotation",
    },
    {
      key: "crmq-other",
      label: "Other doctypes",
      path: "/m/crmq/other",
    },
    {
      key: "crmq-embed-desk",
      label: "ERPNext desk (iframe)",
      path: portalPathForDeskIframe("/app"),
    },
    {
      key: "crmq-embed-lead",
      label: "Leads â€” ERPNext UI",
      path: portalPathForDeskIframe("/app/lead"),
    },
    {
      key: "crmq-embed-opp",
      label: "Opportunities â€” ERPNext UI",
      path: portalPathForDeskIframe("/app/opportunity"),
    },
    {
      key: "crmq-embed-cust",
      label: "Customers â€” ERPNext UI",
      path: portalPathForDeskIframe("/app/customer"),
    },
  ];
}

export async function registerPortalRoutes(app) {
  const pre = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  };

  app.get(
    "/api/v1/portal/menu",
    { preHandler: pre },
    async (request) => {
      const user = request.user;
      const core = await getCoreModulesCached();
      const m = core.modules;
      const base = deskBase();
      const pub = deskPublicBase();
      const erpConfigured = Boolean(base);
      const deskRoot = (pub || base).replace(/\/$/, "");
      const items = [];

      if (m.erp || erpConfigured) {
        items.push({
          key: "erp",
          label: "ERPNext (full desk)",
          path: portalPathForDeskIframe("/app"),
        });
      }

      if (process.env.CITYQ_PORTAL_CRMQ !== "0" && (m.crm || erpConfigured)) {
        items.push({
          key: "crmq-root",
          label: "CRM",
          path: "/m/crmq",
          children: buildCrmMenuChildren(),
        });
      }

      if (process.env.CITYQ_PORTAL_HRQ !== "0") {
        items.push({
          key: "hrq-root",
          label: "HR",
          path: "/m/hrq",
          children: buildHrMenuChildren(),
        });
      }

      if (process.env.CITYQ_PORTAL_PURQ !== "0") {
        items.push({
          key: "purq-root",
          label: "Purchasing",
          path: "/m/purq",
          children: buildPurMenuChildren(),
        });
      }

      if (process.env.CITYQ_PORTAL_SUPPLIERQ !== "0" && (m.erp || erpConfigured)) {
        items.push({
          key: "supplierq-root",
          label: "Supplier Portal",
          path: "/m/supplierq",
          children: buildSupplierMenuChildren(),
        });
      }

      if (env.docqUrl) {
        const isDocAdmin =
          Array.isArray(user?.allowedDocTypes) && user.allowedDocTypes.includes("*");
        const docqChildren = [
          { key: "docq-my", label: "My documents", path: "/m/docq/my-documents" },
          { key: "docq-new", label: "Create documents", path: "/m/docq/new" },
          { key: "docq-register", label: "Uncontrolled Repository", path: "/m/docq/register" },
          { key: "docq-shared-with-me", label: "Shared with me", path: "/m/docq/shared-with-me" },
          { key: "docq-shared-by-me", label: "Shared by me", path: "/m/docq/shared-by-me" },
          { key: "docq-changes", label: "Revision", path: "/m/docq/changes-requested" },
          { key: "docq-review", label: "Documents for Review", path: "/m/docq/for-review" },
          { key: "docq-approval", label: "Documents for Approval", path: "/m/docq/for-approval" },
          { key: "docq-revoke", label: "Revoke documents", path: "/m/docq/revoke" },
        ];
        if (isDocAdmin) {
          docqChildren.push(
            { key: "docq-admin-wf", label: "Workflow (admin)", path: "/m/docq/admin/workflows" },
            { key: "docq-admin-types", label: "Document types (admin)", path: "/m/docq/admin/doc-types" },
            { key: "docq-admin-projects", label: "Projects (admin)", path: "/m/docq/admin/projects" },
          );
        }
        items.push({
          key: "docq-root",
          label: "Documents",
          path: "/m/docq/my-documents",
          children: docqChildren,
        });
      }

      if (m.messaging) {
        items.push({
          key: "messaging",
          label: "Messaging",
          path: "/m/messaging",
        });
      }

      return {
        sub: user.sub,
        email: user.email,
        items,
        modules: core.modules,
        deskBaseUrl: pub || base || null,
        deskIframeQuery: env.erpnextIframeQuery || null,
      };
    },
  );
}
