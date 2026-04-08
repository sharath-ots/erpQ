import { healthRoutes } from "./health.js";
import { settingsRoutes } from "./settings.js";

export async function registerRoutes(app) {
  await app.register(healthRoutes, { prefix: "/api/v1" });
  await app.register(settingsRoutes, { prefix: "/api/v1" });
}
