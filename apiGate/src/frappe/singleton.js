import { FrappeClient } from "@cityq/frapperestq";
import { env } from "../config.js";
import { getFrappeSidForUser } from "../services/frappeSessionStore.js";

let tokenClient = null;

export function getFrappeClient() {
  if (!env.erpnextUrl || !env.erpnextApiKey || !env.erpnextApiSecret) {
    throw new Error(
      "ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET must be set for ERP routes",
    );
  }
  if (!tokenClient) {
    tokenClient = new FrappeClient({
      baseUrl: env.erpnextUrl,
      auth: {
        kind: "token",
        apiKey: env.erpnextApiKey,
        apiSecret: env.erpnextApiSecret,
      },
    });
  }
  return tokenClient;
}

/** Prefer per-user Frappe session cookie when present (native permissions); else integration user token. */
export function getFrappeClientForGatewayUser(email) {
  const sid = email ? getFrappeSidForUser(email) : undefined;
  if (sid && env.erpnextUrl) {
    return new FrappeClient({
      baseUrl: env.erpnextUrl,
      auth: { kind: "cookie", cookieHeader: sid },
    });
  }
  return getFrappeClient();
}
