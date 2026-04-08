import { env } from "../config.js";

const TTL_MS = 30_000;
let cache = null;

const fallback = {
  version: 0,
  modules: { erp: false, crm: false, messaging: false },
  integrations: {},
};

export async function getCoreModulesCached() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.data;
  }
  const url = `${env.coreBackendUrl.replace(/\/$/, "")}/api/v1/modules`;
  const headers = { Accept: "application/json" };
  if (env.cityqServiceKey) {
    headers["X-CityQ-Service-Key"] = env.cityqServiceKey;
  }
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`coreQ ${res.status}`);
    }
    const data = await res.json();
    cache = { data, at: Date.now() };
    return data;
  } catch {
    return { ...fallback };
  }
}

export function invalidateCoreModulesCache() {
  cache = null;
}
