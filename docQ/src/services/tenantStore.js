import { env } from "../config.js";

function parseTenants() {
  const raw = env.tenantsJson;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t && t.id);
  } catch {
    return [];
  }
}

/**
 * @param {string} email
 */
export function resolveTenantIdFromEmail(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em.includes("@")) return null;
  const domain = em.split("@").pop();
  for (const t of parseTenants()) {
    const domains = (t.allowedEmailDomains || []).map((d) =>
      String(d).toLowerCase().replace(/^@/, ""),
    );
    if (domains.includes(domain)) return String(t.id);
  }
  return domain ? domain.replace(/\./g, "-") : null;
}

/**
 * @param {string} email
 */
export function tenantConfigFromEmail(email) {
  const em = String(email || "").trim().toLowerCase();
  const domain = em.includes("@") ? em.split("@").pop() : "";
  for (const t of parseTenants()) {
    const domains = (t.allowedEmailDomains || []).map((d) =>
      String(d).toLowerCase().replace(/^@/, ""),
    );
    if (domains.includes(domain)) {
      return {
        id: String(t.id),
        name: String(t.name || t.id),
        zohoTeamId: t.zohoTeamId ? String(t.zohoTeamId) : "",
        workdriveParentId: t.workdriveParentId
          ? String(t.workdriveParentId)
          : env.sharedParentFolderId || "",
      };
    }
  }
  return {
    id: resolveTenantIdFromEmail(email) || "default",
    name: domain || "default",
    zohoTeamId: "",
    workdriveParentId: env.sharedParentFolderId || "",
  };
}

/**
 * Upsert tenant row and return it.
 * @param {import("pg").Pool} pool
 * @param {ReturnType<typeof tenantConfigFromEmail>} cfg
 */
export async function upsertTenant(pool, cfg) {
  await pool.query(
    `insert into tenants (id, name, workdrive_parent_id, zoho_team_id, updated_at)
     values ($1, $2, nullif($3, ''), nullif($4, ''), now())
     on conflict (id) do update set
       name = excluded.name,
       workdrive_parent_id = coalesce(nullif(excluded.workdrive_parent_id, ''), tenants.workdrive_parent_id),
       zoho_team_id = coalesce(nullif(excluded.zoho_team_id, ''), tenants.zoho_team_id),
       updated_at = now()`,
    [cfg.id, cfg.name, cfg.workdriveParentId || "", cfg.zohoTeamId || ""],
  );
  const { rows } = await pool.query(`select * from tenants where id = $1`, [cfg.id]);
  return rows[0] || null;
}
