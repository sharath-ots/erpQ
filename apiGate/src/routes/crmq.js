import { env } from "../config.js";
import { publishEvent } from "../services/mqPublisher.js";
import { getFrappeClientForGatewayUser } from "../frappe/singleton.js";
import { assertDocTypeAllowed, AccessDeniedError } from "../auth/access.js";

const jwtPre = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized", detail: "Bearer JWT required" });
  }
};

/**
 * Dummy CRM routes (proof-of-flow): create a Lead and publish crm.lead.created.
 */
export async function registerCrmQRoutes(app) {
  app.post("/api/v1/crmq/leads/dummy", { preHandler: jwtPre }, async (request, reply) => {
    const user = request.user;
    try {
      assertDocTypeAllowed(user, "Lead");
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return reply.code(403).send({ error: "forbidden", detail: e.message });
      }
      throw e;
    }

    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const body = request.body ?? {};
    const leadName = String(body.lead_name ?? body.leadName ?? "Dummy Lead").trim() || "Dummy Lead";
    const company = String(body.company_name ?? body.companyName ?? "Dummy Company").trim() || "Dummy Company";
    const email = body.email_id ?? body.email ?? undefined;

    const leadDoc = {
      lead_name: leadName,
      company_name: company,
      email_id: email,
      status: body.status ?? "Lead",
      source: body.source ?? "Portal",
    };

    try {
      const created = await getFrappeClientForGatewayUser(user.email).createDocument("Lead", leadDoc);
      const meta = { actor: user.email ?? user.sub, ip: request.ip };
      const pub = await publishEvent({
        type: "crm.lead.created",
        payload: { lead: created?.name, lead_name: created?.lead_name, company_name: created?.company_name },
        meta,
      });
      return reply.code(201).send({ ok: true, lead: created, event: pub });
    } catch (e) {
      app.log.error({ err: e }, "dummy lead create failed");
      return reply.code(502).send({ error: "lead_create_failed", detail: String(e) });
    }
  });
}

