function req(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(v).trim();
}

function opt(name, fallback = "") {
  const v = process.env[name];
  if (!v || !String(v).trim()) return fallback;
  return String(v).trim();
}

function optInt(name, fallback) {
  const raw = opt(name, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  host: opt("DOCQ_HOST", "0.0.0.0"),
  port: optInt("DOCQ_PORT", 14160),

  // Postgres connection string. Example:
  // postgres://user:pass@host:5432/docq
  databaseUrl: req("DOCQ_DATABASE_URL"),

  // Shared secret for internal service-to-service calls (e.g. authQ -> docQ token upsert).
  cityqServiceKey: opt("CITYQ_SERVICE_KEY", ""),

  // 32-byte base64 key for encrypting refresh tokens at rest.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  tokenEncKeyB64: opt("DOCQ_TOKEN_ENC_KEY_B64", ""),

  // WorkDrive API base. Kept configurable for future multi-DC support.
  workdriveApiBase: opt("DOCQ_WORKDRIVE_API_BASE", "https://www.zohoapis.com"),
};

