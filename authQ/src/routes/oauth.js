/**
 * Placeholders for OIDC/OAuth2 flows (Keycloak, Azure AD, Okta, etc.).
 * Wire authorization_code + PKCE and token exchange in later iterations.
 */
export async function oauthRoutes(app) {
  app.get("/.well-known/openid-configuration", async () => ({
    issuer: process.env.OIDC_ISSUER ?? "http://localhost:4100",
    authorization_endpoint: "/oauth/authorize",
    token_endpoint: "/oauth/token",
    jwks_uri: "/oauth/jwks",
    note: "stub — replace with real IdP integration",
  }));

  app.post("/token", async () => ({
    error: "not_implemented",
    message: "Exchange authorization code or client credentials here.",
  }));
}
