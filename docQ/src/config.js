import { resolveModuleDatabaseUrl, resolvePgSchema } from "./lib/databaseUrl.js";

function opt(name, fallback = "") {
  const v = process.env[name];
  if (!v || !String(v).trim()) return fallback;
  return String(v).trim();
}

function optInt(name, fallback) {
  const raw = opt(name, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Map Zoho accounts DC to WorkDrive API origin when DOCQ_WORKDRIVE_API_BASE is unset. */
function workdriveApiBaseFromAccountsHost(accountsHost) {
  const h = String(accountsHost || "").toLowerCase();
  if (h.includes(".eu")) return "https://www.zohoapis.eu";
  if (h.includes(".in")) return "https://www.zohoapis.in";
  if (h.includes(".com.au")) return "https://www.zohoapis.com.au";
  if (h.includes(".jp")) return "https://www.zohoapis.jp";
  if (h.includes(".ca")) return "https://www.zohoapis.ca";
  return "https://www.zohoapis.com";
}

/** e.g. accounts.zoho.eu → eu, www.zohoapis.com → com */
function zohoDataCenter(hostOrUrl) {
  const h = String(hostOrUrl || "").toLowerCase();
  if (h.includes(".com.au")) return "com.au";
  const m = h.match(/zoho(?:apis)?\.([a-z.]+)/i);
  return m?.[1]?.replace(/\.$/, "") || "com";
}

/**
 * Prefer DOCQ_WORKDRIVE_API_BASE when set, but if it points at a different DC than
 * AUTHQ_ZOHO_ACCOUNTS_HOST (common after switching to .eu), follow accounts instead.
 */
function resolveWorkdriveApiBase(accountsHost, explicit) {
  const derived = workdriveApiBaseFromAccountsHost(accountsHost);
  if (!explicit) return derived;
  const accountsDc = zohoDataCenter(accountsHost);
  const apiDc = zohoDataCenter(explicit);
  if (accountsDc && apiDc && accountsDc !== apiDc) return derived;
  return explicit;
}

const pgSchema = resolvePgSchema("docq");
const zohoAccountsHost = opt(
  "DOCQ_ZOHO_ACCOUNTS_HOST",
  opt("AUTHQ_ZOHO_ACCOUNTS_HOST", "accounts.zoho.com"),
);

export const env = {
  host: opt("DOCQ_HOST", "0.0.0.0"),
  port: optInt("DOCQ_PORT", 14160),

  // Platform Postgres: CITYQ_DATABASE_URL + DOCQ_PG_SCHEMA=docq (or explicit DOCQ_DATABASE_URL).
  databaseUrl: resolveModuleDatabaseUrl({ moduleSchema: pgSchema }),
  pgSchema,

  cityqServiceKey: opt("CITYQ_SERVICE_KEY", ""),
  tokenEncKeyB64: opt("DOCQ_TOKEN_ENC_KEY_B64", ""),

  workdriveApiBase: resolveWorkdriveApiBase(
    zohoAccountsHost,
    opt("DOCQ_WORKDRIVE_API_BASE", ""),
  ),

  zohoClientId: opt("DOCQ_ZOHO_CLIENT_ID", opt("AUTHQ_ZOHO_CLIENT_ID", "")),
  zohoClientSecret: opt("DOCQ_ZOHO_CLIENT_SECRET", opt("AUTHQ_ZOHO_CLIENT_SECRET", "")),
  zohoAccountsHost,

  /** ERPNext integration user for org sync (Employee, Department, User). */
  erpnextUrl: opt("ERPNEXT_URL", ""),
  erpnextApiKey: opt("ERPNEXT_API_KEY", ""),
  erpnextApiSecret: opt("ERPNEXT_API_SECRET", ""),

  /**
   * Org Zoho account that owns managed WorkDrive files.
   * Must have signed in once so zoho_tokens has its refresh token.
   */
  serviceZohoEmail: opt("DOCQ_SERVICE_ZOHO_EMAIL", "").toLowerCase(),

  /** Optional WorkDrive folder IDs for scratch/managed roots (team folder or folder id). */
  scratchRootFolderId: opt("DOCQ_SCRATCH_ROOT", ""),
  managedRootFolderId: opt("DOCQ_MANAGED_ROOT", ""),

  /** Shared library parent (Team Folder / workspace id). Empty = first accessible team workspace. */
  sharedParentFolderId: opt("DOCQ_SHARED_PARENT_FOLDER_ID", ""),
  managedFolderName: opt("DOCQ_MANAGED_FOLDER_NAME", "Managed Org Folder"),
  dumpFolderName: opt("DOCQ_DUMP_FOLDER_NAME", "Shared Dump Folder"),

  /**
   * Multi-tenant registry (shared with authQ). Used to map email → tenant for WorkDrive roots.
   * Example: [{"id":"ortusolis","name":"Ortusolis","allowedEmailDomains":["ortusolis.in"]}]
   */
  tenantsJson: opt("CITYQ_TENANTS_JSON", opt("AUTHQ_TENANTS_JSON", "")),

  /** RabbitMQ for doc.* domain events (optional). */
  mqUrl: opt("CITYQ_MQ_URL", ""),

  /** Default SLA days for approval tasks. */
  approvalSlaDays: optInt("DOCQ_APPROVAL_SLA_DAYS", 5),
};
