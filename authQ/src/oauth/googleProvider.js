import { env } from "../config.js";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleOAuthConfigured() {
  return Boolean(
    env.google.clientId && env.google.clientSecret && env.google.redirectUri,
  );
}

/**
 * @param {{ codeChallenge: string, state: string }} p
 */
export function buildGoogleAuthorizeUrl({ codeChallenge, state }) {
  const u = new URL(AUTH);
  u.searchParams.set("client_id", env.google.clientId);
  u.searchParams.set("redirect_uri", env.google.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", env.google.scope);
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

/**
 * @param {string} code
 * @param {string} codeVerifier
 */
export async function exchangeGoogleCode(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.google.clientId,
    client_secret: env.google.clientSecret,
    redirect_uri: env.google.redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Google token response not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      json.error_description || json.error || `Google token HTTP ${res.status}`,
    );
  }
  return json;
}

/**
 * @param {string} accessToken
 */
export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Google userinfo not JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `Google userinfo ${res.status}`);
  }
  return json;
}

export function googlePrimaryEmail(profile) {
  const e = profile.email;
  if (typeof e === "string" && e.includes("@")) return e.toLowerCase();
  throw new Error("Google profile has no email");
}
