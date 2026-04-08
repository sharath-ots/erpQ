import { GatewayErpNextError } from "../api/gatewayErpNextClient.js";

/**
 * Best-effort counts for CRM dashboard cards (requires DocTypes in JWT allowlist).
 * @param {import("../api/gatewayErpNextClient.js").ErpNextGatewayClient} client
 */
export async function fetchCrmMetrics(client) {
  const out = { leadCount: null, opportunityCount: null, error: null };
  try {
    const [lc, oc] = await Promise.all([
      client.countDocuments("Lead").catch(() => null),
      client.countDocuments("Opportunity").catch(() => null),
    ]);
    if (lc && typeof lc.data === "number") out.leadCount = lc.data;
    if (oc && typeof oc.data === "number") out.opportunityCount = oc.data;
  } catch (e) {
    if (e instanceof GatewayErpNextError) {
      out.error = e.message;
    } else {
      out.error = String(e);
    }
  }
  return out;
}
