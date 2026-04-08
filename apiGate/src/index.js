import proxy from "@fastify/http-proxy";

/**
 * Reverse proxy for **coreQ** only at `/api/v1/core/*` → upstream `/api/v1/*`.
 * Auth + ERPNext routes are registered separately on this app.
 */
export async function registerCoreProxy(app, opts) {
  await app.register(proxy, {
    upstream: opts.coreBackendUrl,
    prefix: "/api/v1/core",
    rewritePrefix: "/api/v1",
  });
}
