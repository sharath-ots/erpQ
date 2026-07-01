import { env } from "../config.js";
import { decryptString } from "../lib/crypto.js";

/** @type {Map<string, { accessToken: string, expiresAt: number }>} */
const accessCache = new Map();

function accountsBase() {
  const h = env.zohoAccountsHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${h}`;
}

function zohoOAuthReady() {
  return Boolean(env.zohoClientId && env.zohoClientSecret);
}

export async function loadRefreshToken(pool, email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) {
    const e = new Error("email_required");
    e.statusCode = 401;
    throw e;
  }
  const { rows } = await pool.query(
    `
      select
        refresh_token_alg,
        refresh_token_iv_b64,
        refresh_token_tag_b64,
        refresh_token_ciphertext_b64
      from zoho_tokens
      where user_email = $1
    `,
    [key],
  );
  if (!rows.length) {
    const e = new Error("workdrive_not_linked");
    e.statusCode = 412;
    e.code = "workdrive_not_linked";
    throw e;
  }
  const row = rows[0];
  return decryptString(
    {
      alg: row.refresh_token_alg,
      iv_b64: row.refresh_token_iv_b64,
      tag_b64: row.refresh_token_tag_b64,
      ciphertext_b64: row.refresh_token_ciphertext_b64,
    },
    env.tokenEncKeyB64,
  );
}

export async function getZohoAccessToken(pool, email) {
  if (!zohoOAuthReady()) {
    const e = new Error("zoho_oauth_not_configured");
    e.statusCode = 503;
    throw e;
  }

  const key = String(email || "").trim().toLowerCase();
  const cached = accessCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  const refreshToken = await loadRefreshToken(pool, key);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.zohoClientId,
    client_secret: env.zohoClientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${accountsBase()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    const e = new Error("zoho_token_response_invalid");
    e.statusCode = 502;
    throw e;
  }
  if (!res.ok || json?.error) {
    const e = new Error(
      json?.error_description || json?.error || `zoho_token_http_${res.status}`,
    );
    e.statusCode = 502;
    e.details = json;
    throw e;
  }
  const accessToken = String(json.access_token || "");
  if (!accessToken) {
    const e = new Error("zoho_access_token_missing");
    e.statusCode = 502;
    throw e;
  }
  const ttlSec = Number(json.expires_in_sec || json.expires_in || 3600);
  accessCache.set(key, {
    accessToken,
    expiresAt: Date.now() + Math.max(60, ttlSec) * 1000,
  });
  return accessToken;
}
