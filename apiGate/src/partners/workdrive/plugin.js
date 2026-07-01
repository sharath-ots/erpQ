import proxy from "@fastify/http-proxy";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config.js";

/**
 * WorkDrive/docQ partner proxy.
 * - Auth: CityQ JWT (same as other gateway routes)
 * - Authorization: enforced by docQ (workflow rules) + WorkDrive (native permissions)
 */
function isDocqUnreachable(err) {
  const code = err?.code || err?.cause?.code;
  return code === "EAI_AGAIN" || code === "ENOTFOUND" || code === "ECONNREFUSED";
}

export async function workdrivePartnerPlugin(app) {
  app.setErrorHandler((err, _request, reply) => {
    if (isDocqUnreachable(err)) {
      return reply.code(503).send({
        error: "docq_unreachable",
        message:
          "Document service (docq) is not running or not on the Docker network. Start cityq-db and docq (see docs/DEPLOY.md).",
      });
    }
    return reply.code(err.statusCode || 500).send({
      error: err.message || "error",
    });
  });

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

