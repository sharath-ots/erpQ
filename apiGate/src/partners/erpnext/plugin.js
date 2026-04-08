import rateLimit from "@fastify/rate-limit";
import { env } from "../../config.js";
import { registerErpnextResourceRoutes } from "./routes.js";

/**
 * ERPNext partner: scoped rate limit + REST routes.
 * @param {import("fastify").FastifyInstance} app
 * @param {{ rateLimitName?: string }} [opts] — pass `rateLimitName` when mounting twice (legacy + partners paths)
 */
export async function erpnextPartnerPlugin(app, opts) {
  const name = opts?.rateLimitName ?? "erpnext-partner";
  await app.register(rateLimit, {
    max: env.erpPartnerRateMax,
    timeWindow: "1 minute",
    name,
  });
  await registerErpnextResourceRoutes(app);
}
