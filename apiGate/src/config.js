export const env = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  jwtExpiresSec: Number(process.env.JWT_EXPIRES_SEC ?? 3600),

  coreBackendUrl: process.env.CORE_BACKEND_URL ?? "http://localhost:4000",

  /** authQ Fastify base URL (for internal mint) */
  authqUrl: (process.env.AUTHQ_URL ?? "http://localhost:4100").replace(/\/$/, ""),

  /** Shared with authQ /internal/mint — must match CITYQ_INTERNAL_KEY on authQ */
  internalServiceKey: process.env.CITYQ_INTERNAL_KEY ?? "cityq-dev-internal-change-me",

  /** Optional — forwarded to coreQ X-CityQ-Service-Key when set */
  cityqServiceKey: process.env.CITYQ_SERVICE_KEY ?? "",

  /** Dev-only: accept login with email only (no authQ) when 1 */
  devInsecureLogin: process.env.DEV_INSECURE_LOGIN === "1",

  /** Optional RabbitMQ connection URL (enables MQ publishing routes when set). */
  mqUrl: (process.env.CITYQ_MQ_URL ?? "").trim(),

  erpnextUrl: (process.env.ERPNEXT_URL ?? "").trim(),
  /** Browser-facing desk URL (defaults to ERPNEXT_URL). Use when internal Docker URL differs. */
  erpnextPublicUrl: (
    process.env.ERPNEXT_PUBLIC_URL ||
    process.env.ERPNEXT_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, ""),
  erpnextApiKey: process.env.ERPNEXT_API_KEY ?? "",
  erpnextApiSecret: process.env.ERPNEXT_API_SECRET ?? "",
  /** Desk path for CRM workspace (Frappe /app route). */
  erpnextCrmPath: (process.env.ERPNEXT_CRM_PATH ?? "/app/crm").replace(
    /\/$/,
    "",
  ),
  /**
   * Optional query string appended to ERPNext iframe URLs (e.g. full_page=1).
   * Frappe reads search params into frappe.route_options; effect depends on ERPNext version.
   */
  erpnextIframeQuery: (process.env.ERPNEXT_IFRAME_QUERY ?? "").trim(),

  /** When 1, gateway allows DocType list/read for any ERP-authenticated JWT (crmQ discovery). */
  erpAllowDoctypeDiscovery: process.env.ERP_ALLOW_DOCTYPE_DISCOVERY === "1",

  /** Per–third-party rate limits (requests per timeWindow). Global limit still applies first. */
  erpPartnerRateMax: Number(process.env.ERP_PARTNER_RATE_MAX ?? 600),
  paymentPartnerRateMax: Number(process.env.PAYMENT_PARTNER_RATE_MAX ?? 120),

  /** e.g. https://accounts.zoho.com — also .eu / .in / .com.au */
  zohoAccountsBase: (process.env.ZOHO_ACCOUNTS_BASE ?? "https://accounts.zoho.com").replace(
    /\/$/,
    "",
  ),
  zohoUserinfoPath:
    process.env.ZOHO_USERINFO_PATH ?? "/oauth/user/info",

  /**
   * JSON map: email -> DocType[] (or "*" for all allowed in ERP for integration user).
   * Example: {"admin@corp.com":["*"],"*":["Customer","Item"]}
   */
  erpAccessMapJson: process.env.ERP_ACCESS_MAP_JSON ?? "",

  /** Comma list used when no map entry matches, e.g. "Customer,Item" */
  erpDefaultDocTypes: (process.env.ERP_DEFAULT_DOCTYPES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /**
   * Optional: ERPNext User email to record as `X-Frappe-User` for permission checks
   * when you later enable per-user API keys. Empty = integration user only.
   */
  erpnextUserEmailFromZoho: process.env.ERPNEXT_USER_EMAIL_FROM_ZOHO === "1",
};
