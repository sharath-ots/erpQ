import { FrappeClient } from "@cityq/frapperestq";
import { env } from "../config.js";
import { getFrappeSidForUser } from "../services/frappeSessionStore.js";

let tokenClient = null;

export function getFrappeClient() {
  if (!env.versaqErpnextUrl || !env.versaqErpnextApiKey || !env.versaqErpnextApiSecret) {
    throw new Error(
      "VERSAQ_ERPNEXT_URL, VERSAQ_ERPNEXT_API_KEY, VERSAQ_ERPNEXT_API_SECRET must be set for ERP routes",
    );
  }
  if (!tokenClient) {
    tokenClient = new FrappeClient({
      baseUrl: env.versaqErpnextUrl,
      auth: {
        kind: "token",
        apiKey: env.versaqErpnextApiKey,
        apiSecret: env.versaqErpnextApiSecret,
      },
    });
  }
  return tokenClient;
}

/** Prefer per-user Frappe session cookie when present (native permissions); else integration user token. */
export function getFrappeClientForGatewayUser(email) {
  const sid = email ? getFrappeSidForUser(email) : undefined;
  if (sid && env.versaqErpnextUrl) {
    return new FrappeClient({
      baseUrl: env.versaqErpnextUrl,
      auth: { kind: "cookie", cookieHeader: sid },
    });
  }
  return getFrappeClient();
}
