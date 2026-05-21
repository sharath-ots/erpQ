import proxy from "@fastify/http-proxy";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config.js";

/**
 * WorkDrive/docQ partner proxy.
 * - Auth: CityQ JWT (same as other gateway routes)
 * - Authorization: enforced by docQ (workflow rules) + WorkDrive (native permissions)
 */
export async function workdrivePartnerPlugin(app) {
  await app.register(rateLimit, {
    max: env.docqPartnerRateMax,
    timeWindow: "1 minute",
    name: "workdrive-partner",
  });

  app.addHook("preHandler", async (request) => {
    await request.jwtVerify();
  });

  app.get("/health", async () => ({
    partner: "workdrive",
    status: env.docqUrl ? "enabled" : "disabled",
    upstream: env.docqUrl || null,
  }));

  if (!env.docqUrl) return;

  await app.register(proxy, {
    upstream: env.docqUrl,
    // Preserve this plugin's prefix; docQ expects paths like /api/v1/docs/...
    prefix: "/",
    rewritePrefix: "/",
    http2: false,
    // Forward the original auth header so docQ can derive request.user by verifying the JWT.
    preHandler: (request, _reply, done) => {
      request.headers["x-cityq-actor-email"] = request.user?.email || "";
      done();
    },
  });
}

