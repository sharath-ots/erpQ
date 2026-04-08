import { loadEffectiveSettings } from "../services/settingsStore.js";

const SERVICE_HEADER = "x-cityq-service-key";

function allowBootstrap(req, reply) {
  const expected = process.env.CITYQ_SERVICE_KEY;
  if (!expected) {
    return true;
  }
  const got = req.headers[SERVICE_HEADER] ?? req.headers["authorization"];
  if (typeof got === "string" && got === `Bearer ${expected}`) return true;
  if (typeof got === "string" && got === expected) return true;
  if (got === expected) return true;
  reply.code(401).send({ error: "unauthorized", detail: "CITYQ_SERVICE_KEY required" });
  return false;
}

export async function settingsRoutes(app) {
  app.get("/settings/effective", async (req, reply) => {
    if (!allowBootstrap(req, reply)) return;
    const effective = await loadEffectiveSettings();
    return effective;
  });

  app.get("/modules", async (req, reply) => {
    if (!allowBootstrap(req, reply)) return;
    const effective = await loadEffectiveSettings();
    return {
      version: effective.version,
      modules: effective.modules,
      integrations: effective.integrations,
    };
  });
}
