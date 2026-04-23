export const dynamic = "force-dynamic";

/**
 * Returns browser-facing config that can only be known at runtime (Docker env).
 * Avoids baking URLs into the Next.js bundle at build time via NEXT_PUBLIC_*.
 */
function guessAuthUrl(requestUrl, headers) {
  const env = process.env.NEXT_PUBLIC_AUTH_URL;
  if (env) return String(env).replace(/\/$/, "");

  // Prefer forwarded headers (reverse proxies) over request.url.
  const proto = headers.get("x-forwarded-proto") || new URL(requestUrl).protocol.replace(":", "");
  const host = headers.get("x-forwarded-host") || headers.get("host") || new URL(requestUrl).host;
  const hostname = host.split(":")[0] || "localhost";
  return `${proto}://${hostname}:3100`;
}

export function GET(request) {
  return Response.json({
    authUrl: guessAuthUrl(request.url, request.headers),
  });
}
