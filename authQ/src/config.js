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

export const env = {
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
  oauthDefaultAllowedDocTypes: trim(process.env.AUTHQ_OAUTH_DEFAULT_ALLOWED_DOC_TYPES ?? "*"),

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
        "openid email profile aaaserver.profile.READ",
    ),
  },
};

export function parseOAuthAllowedDocTypes() {
  const raw = env.oauthDefaultAllowedDocTypes;
  if (!raw || raw === "*") return ["*"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
