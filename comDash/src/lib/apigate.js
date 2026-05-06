/**
 * API base URL strategy:
 *
 * Browser calls always go to the SAME origin as comDash (e.g. http://192.168.1.100:13000).
 * The Next.js App Router proxy at /api/v1/[...path]/route.js forwards those calls to
 * APIGATE_INTERNAL_URL (http://apigate:8080) at runtime inside Docker.
 * This avoids CORS, avoids baking server IPs into the client bundle, and works on any network.
 *
 * Override NEXT_PUBLIC_APIGATE_URL only if you have a specific external API gateway URL
 * (e.g. behind a reverse proxy with a domain name: https://api.example.com).
 */
export const apiBase = process.env.NEXT_PUBLIC_APIGATE_URL ?? "";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("cityq_access_token");
}

/** Returns true if the JWT payload's `exp` is in the past (or payload is unreadable). */
export function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

/**
 * Fetches the auth URL from the server at runtime (avoids baking it into the bundle).
 * Falls back to localhost:3100 if the request fails.
 */
async function getAuthUrl() {
  if (typeof window === "undefined") return "";
  const fromEnv = (process.env.NEXT_PUBLIC_AUTH_URL || "")
    .replace(/\/$/, "")
    .replace(/\/login$/, "");
  if (fromEnv) return fromEnv;
  const port = window.location.port;
  const usePathLogin = !port || port === "80" || port === "443";
  if (usePathLogin) return window.location.origin;
  return `${window.location.protocol}//${window.location.hostname}:3100`;
}

/** Clears the stored token and redirects the browser to the login page. */
export async function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("cityq_access_token");
  const here = `${window.location.origin}${window.location.pathname}`;
  const authUrl = await getAuthUrl();
  window.location.href = `${authUrl}/login?redirect=${encodeURIComponent(here)}`;
}

export async function apiFetch(path, init) {
  const token = getAccessToken();

  if (token && isTokenExpired(token)) {
    await redirectToLogin();
    return new Response(null, { status: 401 });
  }

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  const res = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    await redirectToLogin();
  }

  return res;
}
