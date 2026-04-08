import { healthRoutes } from "./health.js";
import { oauthRoutes } from "./oauth.js";
import { policyRoutes } from "./policy.js";
import { internalRoutes } from "./internal.js";

export async function registerRoutes(app) {
  await app.register(healthRoutes);
  await app.register(internalRoutes);
  await app.register(oauthRoutes, { prefix: "/oauth" });
  await app.register(policyRoutes, { prefix: "/policy" });
}
