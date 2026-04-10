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
 * CRM sidebar (comDash is the only nav). Paths must match crmQ CrmqShell + crmListViews.js.
 */
function buildCrmMenuChildren() {
  return [
    { key: "crmq-dash", label: "Dashboard", path: "/m/crmq" },
    { key: "crmq-lead", label: "Leads", path: "/m/crmq/list/Lead" },
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
      label: "Leads — ERPNext UI",
      path: portalPathForDeskIframe("/app/lead"),
    },
    {
      key: "crmq-embed-opp",
      label: "Opportunities — ERPNext UI",
      path: portalPathForDeskIframe("/app/opportunity"),
    },
    {
      key: "crmq-embed-cust",
      label: "Customers — ERPNext UI",
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
