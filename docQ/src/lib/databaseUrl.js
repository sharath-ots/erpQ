/**
 * Platform Postgres: one server (CITYQ_DATABASE_URL), one schema per module (DOCQ_PG_SCHEMA).
 */

function opt(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) return "";
  return String(v).trim();
}

function assertSchemaName(schema) {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid Postgres schema name: ${schema}`);
  }
  return schema;
}

function withSearchPath(url, schema) {
  const safe = assertSchemaName(schema);
  if (/search_path=/i.test(url)) return url;
  const optVal = encodeURIComponent(`-c search_path=${safe},public`);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}options=${optVal}`;
}

/**
 * @param {{ moduleSchema: string, moduleUrlEnv?: string, platformUrlEnv?: string }} p
 */
export function resolveModuleDatabaseUrl(p) {
  const moduleUrlEnv = p.moduleUrlEnv || "DOCQ_DATABASE_URL";
  const platformUrlEnv = p.platformUrlEnv || "CITYQ_DATABASE_URL";
  const schema = assertSchemaName(p.moduleSchema || "docq");

  const direct = opt(moduleUrlEnv);
  if (direct) return direct;

  const platform = opt(platformUrlEnv);
  if (platform) return withSearchPath(platform, schema);

  throw new Error(`Missing ${moduleUrlEnv} or ${platformUrlEnv}`);
}

export function resolvePgSchema(fallback = "docq") {
  return assertSchemaName(opt("DOCQ_PG_SCHEMA") || fallback);
}
