export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);

  // Local: http://localhost:13000 -> auth-web default http://localhost:3100
  // Traefik: https://erpq.lan -> auth-web is usually https://erpq.lan/login
  const origin = url.origin;
  const defaultAuthUrl =
    url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? `${url.protocol}//${url.hostname}:3100`
      : `${origin}/login`;

  const authUrl = (process.env.NEXT_PUBLIC_AUTH_URL || defaultAuthUrl).replace(
    /\/$/,
    "",
  );
  const apiUrl = (process.env.NEXT_PUBLIC_APIGATE_URL || `${origin}/api`).replace(
    /\/$/,
    "",
  );

  return Response.json(
    {
      authUrl,
      apiUrl,
      publicHost: process.env.PUBLIC_HOST || url.hostname,
      publicScheme: process.env.PUBLIC_SCHEME || url.protocol.replace(":", ""),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

