import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./config.js";
import { pool } from "./db/pool.js";
import { migrate } from "./db/migrate.js";
import { healthRoutes } from "./routes/health.js";
import { internalRoutes } from "./routes/internal.js";
import { docsRoutes } from "./routes/docs.js";
import { workflowsRoutes } from "./routes/workflows.js";
import { dashboardRoutes } from "./routes/dashboard.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });

// The browser-facing auth is enforced at apiGate; docQ still verifies JWT so it can trust `request.user`.
// Keep the secret aligned with apiGate/authQ (CITYQ_JWT_SECRET in your env files).
await app.register(jwt, {
  secret: process.env.CITYQ_JWT_SECRET || process.env.JWT_SECRET || "dev-change-me",
});

app.addHook("preHandler", async (request) => {
  const auth = request.headers.authorization || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return;
  try {
    await request.jwtVerify();
  } catch {
    // Let routes that require auth throw a clean 401; internal routes use service key.
  }
});

await migrate({ pool, logger: app.log });

await healthRoutes(app, { pool });
await internalRoutes(app, { pool });
await docsRoutes(app, { pool });
await workflowsRoutes(app, { pool });
await dashboardRoutes(app, { pool });

await app.listen({ port: env.port, host: env.host });

