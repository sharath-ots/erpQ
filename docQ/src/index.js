import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { env } from "./config.js";
import { pool } from "./db/pool.js";
import { migrate } from "./db/migrate.js";
import { healthRoutes } from "./routes/health.js";
import { internalRoutes } from "./routes/internal.js";
import { docsRoutes } from "./routes/docs.js";
import { workflowsRoutes } from "./routes/workflows.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { workdriveBrowseRoutes } from "./routes/workdriveBrowse.js";
import { documentsListRoutes } from "./routes/documentsList.js";
import { transitionsRoutes } from "./routes/transitions.js";
import { inboxRoutes } from "./routes/inbox.js";
import { sharesRoutes } from "./routes/shares.js";
import { docTypesRoutes } from "./routes/docTypes.js";
import { projectsRoutes } from "./routes/projects.js";
import { scratchRoutes } from "./routes/scratch.js";
import { orgRoutes } from "./routes/org.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 1024 } });

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
await documentsListRoutes(app, { pool });
await transitionsRoutes(app, { pool });
await inboxRoutes(app, { pool });
await sharesRoutes(app, { pool });
await docTypesRoutes(app, { pool });
await projectsRoutes(app, { pool });
await scratchRoutes(app, { pool });
await orgRoutes(app, { pool });
await workflowsRoutes(app, { pool });
await dashboardRoutes(app, { pool });
await workdriveBrowseRoutes(app, { pool });

await app.listen({ port: env.port, host: env.host });
