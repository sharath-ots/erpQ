/**
 * Runtime proxy: /api/v1/* → APIGATE_INTERNAL_URL/api/v1/*
 *
 * Why an API route instead of next.config.js rewrites:
 * next.config.js is evaluated at `next build` time, so process.env values are baked
 * into the bundle and can't be overridden at container startup. This route reads
 * APIGATE_INTERNAL_URL from the actual Docker runtime environment on every request.
 *
 * docker-compose sets: APIGATE_INTERNAL_URL=http://apigate:8080
 * Local dev default:   http://localhost:18080
 */
export const dynamic = "force-dynamic";

const APIGATE = (
  process.env.APIGATE_INTERNAL_URL ?? "http://localhost:18080"
).replace(/\/$/, "");

async function proxy(request, context) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = `${APIGATE}/api/v1/${path.join("/")}${incoming.search}`;

  const headers = new Headers();
  // Forward auth + content-type only; strip hop-by-hop headers
  const forward = ["authorization", "content-type", "accept", "cookie"];
  for (const h of forward) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    ...(hasBody ? { duplex: "half" } : {}),
  });

  // Forward response headers that matter to the client
  const respHeaders = new Headers();
  for (const h of ["content-type", "set-cookie", "cache-control"]) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
