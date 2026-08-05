import { requireJwt, normalizeEmail } from "../lib/auth.js";
import { getOrgUser, listErpUsers, syncOrgUser } from "../services/erpOrgSync.js";

export async function orgRoutes(app, { pool }) {
  app.get("/api/v1/docs/org/me", async (request, reply) => {
    const actor = requireJwt(request);
    const row = await getOrgUser(pool, actor.email);
    return reply.send({ org: row });
  });

  app.post("/api/v1/docs/org/sync", async (request, reply) => {
    const actor = requireJwt(request);
    const row = await syncOrgUser(pool, actor.email);
    return reply.send({ ok: true, org: row });
  });

  app.get("/api/v1/docs/org/users", async (request, reply) => {
    const actor = requireJwt(request);
    const q = request.query?.q ? String(request.query.q) : "";
    const domainFromActor = normalizeEmail(actor.email).includes("@")
      ? normalizeEmail(actor.email).split("@")[1]
      : "";
    // Default: same email domain as the logged-in user. Pass domain= to override, or domain=* for all.
    const domainRaw = request.query?.domain != null ? String(request.query.domain) : domainFromActor;
    const domain = domainRaw === "*" || domainRaw === "all" ? "" : domainRaw;
    const limit = Math.min(Number(request.query?.limit) || 100, 200);
    const users = await listErpUsers(pool, { q, limit, domain });
    return reply.send({
      users,
      meta: {
        domain: domain || null,
        source: "erpnext_or_org_cache",
        criteria:
          "Enabled ERPNext Users" +
          (domain ? ` with email @${domain}` : "") +
          (q ? ` matching "${q}"` : "") +
          `; max ${limit}. You can also type any email in the UI.`,
      },
    });
  });
}
