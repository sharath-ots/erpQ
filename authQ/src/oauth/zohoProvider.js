import { env } from "../config.js";

function accountsBase() {
  const h = env.zoho.accountsHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${h}`;
}

export function zohoOAuthConfigured() {
  return Boolean(
    env.zoho.clientId && env.zoho.clientSecret && env.zoho.redirectUri,
  );
}

/**
 * @param {{ codeChallenge: string, state: string }} p
 */
export function buildZohoAuthorizeUrl({ codeChallenge, state }) {
  const base = accountsBase();
  const u = new URL(`${base}/oauth/v2/auth`);
  u.searchParams.set("client_id", env.zoho.clientId);
  u.searchParams.set("redirect_uri", env.zoho.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", env.zoho.scope);
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

/**
 * @param {string} code
 * @param {string} codeVerifier
 */
export async function exchangeZohoCode(code, codeVerifier) {
  const base = accountsBase();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.zoho.clientId,
    client_secret: env.zoho.clientSecret,
    redirect_uri: env.zoho.redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${base}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Zoho token response not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      json.error_description || json.error || `Zoho token HTTP ${res.status}`,
    );
  }
  return json;
}

/**
 * @see https://www.zoho.com/accounts/protocol/oauth/userinfo.html
 * @param {string} accessToken
 */
export async function fetchZohoUserInfo(accessToken) {
  const base = accountsBase();
  const url = `${base}/oauth/user/info`;
  async function tryHeaders(authHeader) {
    return fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });
  }
  let res = await tryHeaders(`Bearer ${accessToken}`);
  if (res.status === 401) {
    res = await tryHeaders(`Zoho-oauthtoken ${accessToken}`);
  }
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Zoho userinfo not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      json.error || json.message || `Zoho userinfo HTTP ${res.status}`,
    );
  }
  return json;
}

export function zohoPrimaryEmail(profile) {
  const e = profile.Email ?? profile.email;
  if (typeof e === "string" && e.includes("@")) return e.toLowerCase();
  throw new Error("Zoho profile has no email");
}
