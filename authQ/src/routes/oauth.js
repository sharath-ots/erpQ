/**
 * OAuth2 authorization-code + PKCE for Google and Zoho (IdP accounts).
 * Credentials: AUTHQ_GOOGLE_* / AUTHQ_ZOHO_* — never hardcode; use env / secrets manager.
 */
import { env } from "../config.js";
import { randomState, generatePkcePair } from "../lib/oauthPkce.js";
import {
  saveOAuthState,
  takeOAuthState,
} from "../lib/oauthStateStore.js";
import { resolveSafeReturnUrl } from "../lib/returnUrl.js";
import { mintCityQAccessToken } from "../services/accessToken.js";
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  googleOAuthConfigured,
  googlePrimaryEmail,
} from "../oauth/googleProvider.js";
import {
  buildZohoAuthorizeUrl,
  exchangeZohoCode,
  fetchZohoUserInfo,
  zohoOAuthConfigured,
  zohoPrimaryEmail,
} from "../oauth/zohoProvider.js";

function absoluteCallbackPath(provider) {
  const base = env.publicBaseUrl;
  if (!base) return null;
  return `${base}/oauth/${provider}/callback`;
}

/** Align with comDash AuthGate: hash param `cityq_token` → localStorage `cityq_access_token`. */
function redirectWithFragment(reply, returnUrl, accessToken) {
  const u = new URL(returnUrl);
  u.hash = `cityq_token=${encodeURIComponent(accessToken)}`;
  return reply.redirect(u.toString(), 302);
}

function registerProvider(app, provider, {
  configured,
  buildAuthorizeUrl,
  exchangeCode,
  fetchProfile,
  primaryEmail,
  mapClaims,
}) {
  const startPath = `/${provider}/start`;
  const cbPath = `/${provider}/callback`;

  app.get(startPath, async (request, reply) => {
    if (!configured()) {
      return reply.code(503).send({
        error: `${provider}_oauth_not_configured`,
        detail: `Set AUTHQ_${provider.toUpperCase()}_CLIENT_ID, CLIENT_SECRET, REDIRECT_URI`,
      });
    }
    if (!env.publicBaseUrl) {
      return reply.code(503).send({
        error: "authq_public_base_url_missing",
        detail: "Set AUTHQ_PUBLIC_BASE_URL to this service's public origin (e.g. http://localhost:14100)",
      });
    }
    const returnUrl = resolveSafeReturnUrl(request.query?.return_url);
    if (!returnUrl) {
      return reply.code(400).send({
        error: "invalid_return_url",
        detail:
          "Provide return_url matching AUTHQ_OAUTH_RETURN_URL_PREFIXES, or fix AUTHQ_OAUTH_DEFAULT_RETURN_URL",
      });
    }

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = randomState();
    saveOAuthState(state, {
      codeVerifier,
      returnUrl,
      provider,
    });

    const location = buildAuthorizeUrl({ codeChallenge, state });
    return reply.redirect(location, 302);
  });

  app.get(cbPath, async (request, reply) => {
    const err = request.query?.error;
    if (err) {
      return reply.code(400).send({
        error: "oauth_provider_error",
        detail: String(request.query?.error_description ?? err),
      });
    }
    const code = request.query?.code;
    const state = request.query?.state;
    if (!code || !state) {
      return reply.code(400).send({ error: "code_and_state_required" });
    }

    const row = takeOAuthState(state);
    if (!row || row.provider !== provider) {
      return reply.code(400).send({ error: "invalid_or_expired_state" });
    }

    let tokens;
    try {
      tokens = await exchangeCode(code, row.codeVerifier);
    } catch (e) {
      request.log.error({ err: e }, `${provider} token exchange failed`);
      return reply.code(502).send({
        error: "token_exchange_failed",
        detail: String(e?.message ?? e),
      });
    }

    const access = tokens.access_token;
    if (!access) {
      request.log.error(
        { tokens },
        `${provider} token response missing access_token`,
      );
      return reply.code(502).send({
        error: "no_access_token",
        detail:
          "Token response did not include access_token. Check Zoho app DC (AUTHQ_ZOHO_ACCOUNTS_HOST), redirect URI, and scopes.",
        token_keys:
          tokens && typeof tokens === "object" ? Object.keys(tokens) : [],
      });
    }

    let profile;
    try {
      profile = await fetchProfile(access);
    } catch (e) {
      request.log.error({ err: e }, `${provider} userinfo failed`);
      return reply.code(502).send({
        error: "userinfo_failed",
        detail: String(e?.message ?? e),
      });
    }

    let email;
    try {
      email = primaryEmail(profile);
    } catch (e) {
      return reply.code(502).send({
        error: "no_email_in_profile",
        detail: String(e?.message ?? e),
      });
    }

    const claims = mapClaims(profile, email);
    let minted;
    try {
      minted = await mintCityQAccessToken(reply, claims);
    } catch (e) {
      request.log.error({ err: e }, "mint failed");
      return reply.code(500).send({ error: "mint_failed" });
    }

    return redirectWithFragment(reply, row.returnUrl, minted.access_token);
  });
}

export async function oauthRoutes(app) {
  app.get("/.well-known/openid-configuration", async () => ({
    issuer: env.publicBaseUrl || process.env.OIDC_ISSUER || "http://localhost:4100",
    authorization_endpoint: `${env.publicBaseUrl || ""}/oauth/google/start`,
    token_endpoint: "/oauth/token",
    jwks_uri: "/oauth/jwks",
    note: "CityQ authQ — Google/Zoho OAuth entry points under /oauth/{provider}/start",
  }));

  app.post("/token", async () => ({
    error: "not_implemented",
    message: "Use Google/Zoho browser flows or POST /internal/mint with service key.",
  }));

  registerProvider(app, "google", {
    configured: googleOAuthConfigured,
    buildAuthorizeUrl: buildGoogleAuthorizeUrl,
    exchangeCode: exchangeGoogleCode,
    fetchProfile: fetchGoogleUserInfo,
    primaryEmail: googlePrimaryEmail,
    mapClaims: (profile, email) => ({
      sub: email,
      email,
      googleSub: typeof profile.sub === "string" ? profile.sub : undefined,
    }),
  });

  registerProvider(app, "zoho", {
    configured: zohoOAuthConfigured,
    buildAuthorizeUrl: buildZohoAuthorizeUrl,
    exchangeCode: exchangeZohoCode,
    fetchProfile: fetchZohoUserInfo,
    primaryEmail: zohoPrimaryEmail,
    mapClaims: (profile, email) => ({
      sub: email,
      email,
      zohoId:
        (typeof profile.ZUID === "string" && profile.ZUID) ||
        (typeof profile.zuid === "string" && profile.zuid) ||
        undefined,
    }),
  });

  app.get("/status", async () => ({
    google: {
      configured: googleOAuthConfigured(),
      callback: absoluteCallbackPath("google"),
    },
    zoho: {
      configured: zohoOAuthConfigured(),
      callback: absoluteCallbackPath("zoho"),
    },
    publicBaseUrl: env.publicBaseUrl || null,
  }));
}
