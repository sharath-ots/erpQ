import { env } from "../config.js";

/** @returns {Promise<import("../vendor/frapperestq/src/frappe-client.js").FrappeClient | null>} */
export async function erpClient() {
  if (!env.erpnextUrl || !env.erpnextApiKey || !env.erpnextApiSecret) {
    return null;
  }
  const m = await import("../vendor/frapperestq/src/index.js");
  return new m.FrappeClient({
    baseUrl: env.erpnextUrl,
    auth: {
      kind: "token",
      apiKey: env.erpnextApiKey,
      apiSecret: env.erpnextApiSecret,
    },
  });
}
