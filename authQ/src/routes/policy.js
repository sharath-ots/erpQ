/** Future: ABAC/RBAC checks for gateway and services */
export async function policyRoutes(app) {
  app.post("/evaluate", async (request) => ({
    decision: "allow",
    reason: "stub",
    bodyEcho: request.body,
  }));
}
