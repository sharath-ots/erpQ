import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerCoreProxy } from "./index.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerSessionRoutes } from "./routes/session.js";
import { registerPortalRoutes } from "./routes/portal.js";
import { registerMqRoutes } from "./routes/mq.js";
import { registerCrmQRoutes } from "./routes/crmq.js";
import { registerSupplierQRoutes } from "./routes/supplierq.js";
import { env } from "./config.js";
import { getCoreModulesCached } from "./services/coreSettings.js";
import { startMqWorkflowConsumer } from "./services/mqWorkflowConsumer.js";

const app = Fastify({ logger: true });

function readCookie(cookieHeader, name) {
  const parts = String(cookieHeader || "").split(";");
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey !== name) continue;
    return decodeURIComponent(rawValue.join("=") || "");
  }
  return "";
}

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  timeWindow: "1 minute",
});

await app.register(jwt, {
  secret: env.jwtSecret,
});

app.addHook("onRequest", async (request) => {
  if (request.headers.authorization) return;
  const token = readCookie(request.headers.cookie, "cityq_access_token");
  if (token) {
    request.headers.authorization = `Bearer ${token}`;
  }
});

await registerAuthRoutes(app);
await registerSessionRoutes(app);
await registerPortalRoutes(app);
await registerMqRoutes(app);
await registerCrmQRoutes(app);
await registerSupplierQRoutes(app);
startMqWorkflowConsumer({ logger: app.log });

const { paymentPartnerPlugin } = await import("./partners/payment/plugin.js");
await app.register(paymentPartnerPlugin, {
  prefix: "/api/v1/partners/payment",
});

if (env.docqUrl) {
  const { workdrivePartnerPlugin } = await import(
    "./partners/workdrive/plugin.js"
  );
  await app.register(workdrivePartnerPlugin, {
    prefix: "/api/v1/partners/workdrive",
  });
  app.log.info("WorkDrive partner routes registered");
} else {
  app.log.info("WorkDrive partner routes skipped (DOCQ_URL missing)");
}

const coreModules = await getCoreModulesCached();
const erpCredentialsOk = Boolean(
  env.erpnextUrl && env.erpnextApiKey && env.erpnextApiSecret,
);
const erpPluginEnabled =
  coreModules.modules?.erp === true && erpCredentialsOk;

if (erpPluginEnabled) {
  const { erpnextPartnerPlugin } = await import("./partners/erpnext/plugin.js");
  await app.register(erpnextPartnerPlugin, {
    prefix: "/api/v1/partners/erpnext",
    rateLimitName: "erpnext-partner-v1",
  });
  await app.register(erpnextPartnerPlugin, {
    prefix: "/api/v1/erp",
    rateLimitName: "erpnext-legacy-v1",
  });
  app.log.info(
    "ERPNext partner routes registered (scoped rate limits; legacy /api/v1/erp mirrored)",
  );
} else {
  app.log.info(
    { coreModules: coreModules.modules, erpCredentialsOk },
    "ERP partner routes skipped",
  );
}

const coreBackendUrl = env.coreBackendUrl;
await registerCoreProxy(app, { coreBackendUrl });

app.get("/health", async () => {
  let coreq = "down";
  try {
    const headers = {};
    if (env.cityqServiceKey) {
      headers["X-CityQ-Service-Key"] = env.cityqServiceKey;
    }
    const r = await fetch(
      `${env.coreBackendUrl.replace(/\/$/, "")}/api/v1/health`,
      { headers },
    );
    coreq = r.ok ? "ok" : "degraded";
  } catch {
    coreq = "down";
  }

  let authq = "down";
  try {
    const r = await fetch(`${env.authqUrl}/health`);
    authq = r.ok ? "ok" : "down";
  } catch {
    authq = "down";
  }

  let docq = env.docqUrl ? "down" : "disabled";
  if (env.docqUrl) {
    try {
      const r = await fetch(`${env.docqUrl.replace(/\/$/, "")}/health`);
      docq = r.ok ? "ok" : "degraded";
    } catch {
      docq = "down";
    }
  }

  return {
    status: "ok",
    service: "apigate",
    upstream_core: coreBackendUrl,
    docq,
    docq_url: env.docqUrl || null,
    erp: erpPluginEnabled ? "enabled" : "disabled",
    erp_partner_paths: erpPluginEnabled
      ? ["/api/v1/partners/erpnext", "/api/v1/erp"]
      : [],
    payment_partner_path: "/api/v1/partners/payment",
    coreq,
    authq,
    erpnext_configured: erpCredentialsOk,
  };
});

await app.listen({ port: env.port, host: env.host });
