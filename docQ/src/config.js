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

  workdriveApiBase: opt(
    "DOCQ_WORKDRIVE_API_BASE",
    workdriveApiBaseFromAccountsHost(zohoAccountsHost),
  ),

  zohoClientId: opt("DOCQ_ZOHO_CLIENT_ID", opt("AUTHQ_ZOHO_CLIENT_ID", "")),
  zohoClientSecret: opt("DOCQ_ZOHO_CLIENT_SECRET", opt("AUTHQ_ZOHO_CLIENT_SECRET", "")),
  zohoAccountsHost,
};
