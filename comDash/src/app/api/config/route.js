export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);

  // Port-based: http(s)://host:13001 -> auth-web on host:3100. Standard 80/443 -> same-origin /login (reverse proxy).
  const origin = url.origin;
  const port = url.port;
  const usePathLogin = !port || port === "80" || port === "443";
  const defaultAuthUrl = usePathLogin
    ? origin
    : `${url.protocol}//${url.hostname}:3100`;

  const authUrl = (process.env.NEXT_PUBLIC_AUTH_URL || defaultAuthUrl)
    .replace(/\/$/, "")
    .replace(/\/login$/, "");
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

