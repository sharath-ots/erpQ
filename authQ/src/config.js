/**
 * authQ environment — OAuth client ids/secrets are never committed; set via env / secrets manager.
 * Placeholders below document variable names only.
 */

function trim(v) {
  return String(v ?? "").trim();
}

function listCsv(v) {
  return trim(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTenantsJson(raw) {
  const s = trim(raw);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === "object" && t.id)
      .map((t) => ({
        id: String(t.id).trim(),
        name: String(t.name || t.id).trim(),
        allowedEmailDomains: Array.isArray(t.allowedEmailDomains)
          ? t.allowedEmailDomains.map((d) => String(d).trim().toLowerCase().replace(/^@/, ""))
          : [],
        zohoOrgId: t.zohoOrgId ? String(t.zohoOrgId).trim() : "",
        zohoTeamId: t.zohoTeamId ? String(t.zohoTeamId).trim() : "",
        workdriveParentId: t.workdriveParentId
          ? String(t.workdriveParentId).trim()
          : "",
      }));
  } catch {
    return [];
  }
}

export const env = {

  VersaqERPNextUrl: trim(process.env.VERSAQ_ERPNEXT_URL ?? "https://cityqerp.ortusolis.in"),
  VersaqERPNextApiKey: trim(process.env.VERSAQ_ERPNEXT_API_KEY),
  VersaqERPNextApiSecret: trim(process.env.VERSAQ_ERPNEXT_API_SECRET),

  jwtExpiresSec: Number(process.env.JWT_EXPIRES_SEC ?? 3600),

  /** Public base URL of this auth API (browser redirects), e.g. http://localhost:14100 */
  publicBaseUrl: trim(process.env.AUTHQ_PUBLIC_BASE_URL).replace(/\/$/, ""),

  /**
   * Comma-separated URL prefixes allowed for ?return_url= after OAuth (fragment token delivery).
   * Example: http://localhost:13001,http://localhost:3000
   */
  oauthReturnUrlPrefixes: listCsv(
    process.env.AUTHQ_OAUTH_RETURN_URL_PREFIXES ??
      "http://localhost:13001,http://localhost:3000,http://127.0.0.1:13001",
  ),

  /** When ?return_url= is omitted, use this (must match a prefix above). */
  oauthDefaultReturnUrl: trim(
    process.env.AUTHQ_OAUTH_DEFAULT_RETURN_URL ?? "http://localhost:13001/login",
  ),

  /**
   * Default ERP doc-type allow list for OAuth users (same semantics as apiGate email map).
   * Use "*" for all types the integration user can access, or comma-separated DocType names.
   */
  oauthDefaultAllowedDocTypes: trim(process.env.AUTHQ_OAUTH_DEFAULT_ALLOWED_DOC_TYPES ?? "design,cad,general,manual,policy,spec,contract"),

  /** Emails that receive allowedDocTypes ["*"] (docQ workflow admin). */
  docqAdminEmails: listCsv(process.env.AUTHQ_DOCQ_ADMIN_EMAILS).map((e) => e.toLowerCase()),

  /**
   * B2B: only these email domains may complete Zoho/Google OAuth (customer org accounts).
   * Empty = open (dev). Production should set e.g. ortusolis.in
   */
  allowedEmailDomains: listCsv(process.env.AUTHQ_ALLOWED_EMAIL_DOMAINS).map((d) =>
    d.toLowerCase().replace(/^@/, ""),
  ),
  /** Optional exact email allowlist (in addition to domains). */
  allowedEmails: listCsv(process.env.AUTHQ_ALLOWED_EMAILS).map((e) => e.toLowerCase()),

  /**
   * Multi-tenant registry (same JSON often shared as CITYQ_TENANTS_JSON).
   * Each entry is one sold customer org ↔ Zoho organization.
   */
  tenants: parseTenantsJson(
    process.env.CITYQ_TENANTS_JSON || process.env.AUTHQ_TENANTS_JSON || "",
  ),

  /** Google OAuth 2.0 (set in Google Cloud Console → Credentials). */
  google: {
    clientId: trim(process.env.AUTHQ_GOOGLE_CLIENT_ID),
    clientSecret: trim(process.env.AUTHQ_GOOGLE_CLIENT_SECRET),
    redirectUri: trim(process.env.AUTHQ_GOOGLE_REDIRECT_URI),
    /** Space-separated scopes */
    scope: trim(
      process.env.AUTHQ_GOOGLE_SCOPE ??
        "openid email profile",
    ),
  },

  /**
   * Zoho OAuth 2.0 — register app in Zoho API Console; pick accounts domain for your DC.
   * @see https://www.zoho.com/accounts/protocol/oauth/web-server-applications.html
   */
  zoho: {
    clientId: trim(process.env.AUTHQ_ZOHO_CLIENT_ID),
    clientSecret: trim(process.env.AUTHQ_ZOHO_CLIENT_SECRET),
    redirectUri: trim(process.env.AUTHQ_ZOHO_REDIRECT_URI),
    /** e.g. accounts.zoho.com, accounts.zoho.eu, accounts.zoho.in */
    accountsHost: trim(process.env.AUTHQ_ZOHO_ACCOUNTS_HOST || "accounts.zoho.com"),
    scope: trim(
      process.env.AUTHQ_ZOHO_SCOPE ??
        // Keep profile scopes for userinfo + add WorkDrive read scopes for docQ.
        "openid email profile aaaserver.profile.READ WorkDrive.files.READ WorkDrive.files.CREATE WorkDrive.files.ALL WorkDrive.team.READ WorkDrive.workspace.READ WorkDrive.teamfolders.READ",
    ),
  },

  // Optional: internal docQ URL for storing Zoho refresh tokens (authQ -> docQ).
  docqInternalUrl: trim(process.env.AUTHQ_DOCQ_INTERNAL_URL || ""),
  cityqServiceKey: trim(process.env.CITYQ_SERVICE_KEY || ""),
};

export function resolveAllowedDocTypesForEmail(email) {
  const em = String(email ?? "").trim().toLowerCase();
  if (em && env.docqAdminEmails.includes(em)) return ["*"];
  return parseOAuthAllowedDocTypes();
}

export function parseOAuthAllowedDocTypes() {
  const raw = env.oauthDefaultAllowedDocTypes;
  if (!raw || raw === "*") return ["*"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
