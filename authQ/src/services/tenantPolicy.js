/**
 * B2B tenancy for Zoho OAuth (multi-customer orgs).
 *
 * Env:
 * - AUTHQ_ALLOWED_EMAIL_DOMAINS=ortusolis.in,acme.com
 * - AUTHQ_ALLOWED_EMAILS=admin@acme.com  (optional exact list)
 * - CITYQ_TENANTS_JSON=[{"id":"ortusolis","name":"Ortusolis","allowedEmailDomains":["ortusolis.in"]}]
 *
 * If domains/emails lists are empty → allow all (dev only). For production B2B, set domains.
 */

import { env } from "../config.js";

/**
 * @param {string} email
 * @returns {{ id: string, name: string, allowedEmailDomains: string[], zohoOrgId?: string, zohoTeamId?: string, workdriveParentId?: string } | null}
 */
export function resolveTenantForEmail(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em.includes("@")) return null;
  const domain = em.split("@").pop();

  for (const t of env.tenants) {
    const domains = (t.allowedEmailDomains || []).map((d) =>
      String(d).toLowerCase().replace(/^@/, ""),
    );
    if (domains.includes(domain)) {
      return {
        id: String(t.id),
        name: String(t.name || t.id),
        allowedEmailDomains: domains,
        zohoOrgId: t.zohoOrgId ? String(t.zohoOrgId) : undefined,
        zohoTeamId: t.zohoTeamId ? String(t.zohoTeamId) : undefined,
        workdriveParentId: t.workdriveParentId
          ? String(t.workdriveParentId)
          : undefined,
      };
    }
  }

  // Synthetic tenant from domain when only AUTHQ_ALLOWED_EMAIL_DOMAINS is set
  if (env.allowedEmailDomains.includes(domain)) {
    return {
      id: domain.replace(/\./g, "-"),
      name: domain,
      allowedEmailDomains: [domain],
    };
  }

  return null;
}

/**
 * Reject personal / non-customer Zoho accounts when allowlists are configured.
 * @param {string} email
 * @param {"zoho"|"google"} provider
 */
export function assertOrgAccountAllowed(email, provider) {
  const em = String(email || "").trim().toLowerCase();
  const hasAllowlist =
    env.allowedEmailDomains.length > 0 ||
    env.allowedEmails.length > 0 ||
    env.tenants.length > 0;

  if (!hasAllowlist) {
    return { ok: true, tenant: null, mode: "open_dev" };
  }

  if (env.allowedEmails.length && env.allowedEmails.includes(em)) {
    return {
      ok: true,
      tenant: resolveTenantForEmail(em),
      mode: "email_allowlist",
    };
  }

  const domain = em.includes("@") ? em.split("@").pop() : "";
  const domainOk =
    env.allowedEmailDomains.includes(domain) ||
    env.tenants.some((t) =>
      (t.allowedEmailDomains || [])
        .map((d) => String(d).toLowerCase().replace(/^@/, ""))
        .includes(domain),
    );

  if (!domainOk) {
    const err = new Error(
      `${provider}_account_not_in_customer_org: ${em}. Only organization accounts for contracted customers may sign in.`,
    );
    err.statusCode = 403;
    err.code = "org_account_required";
    throw err;
  }

  return {
    ok: true,
    tenant: resolveTenantForEmail(em),
    mode: "domain_allowlist",
  };
}
