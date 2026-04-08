import { env } from "../config.js";

/**
 * Resolve allowed DocTypes from env map + defaults.
 * Use "*" entry to mean all doctypes the integration user can access in ERPNext
 * (gateway still relies on Frappe server-side permissions for the API key).
 */
export function resolveAllowedDocTypes(email) {
  const map = parseAccessMap();
  const key = email.toLowerCase();
  if (map[key]?.length) return expandStars(map[key]);
  if (map["*"]?.length) return expandStars(map["*"]);
  if (env.erpDefaultDocTypes.length) return expandStars(env.erpDefaultDocTypes);
  return [];
}

function expandStars(list) {
  const out = new Set();
  for (const d of list) {
    const t = d.trim();
    if (t) out.add(t);
  }
  return [...out];
}

function parseAccessMap() {
  if (!env.erpAccessMapJson.trim()) return {};
  try {
    const raw = JSON.parse(env.erpAccessMapJson);
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k.toLowerCase()] = Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim());
    }
    return out;
  } catch {
    return {};
  }
}

export function assertDocTypeAllowed(payload, doctype) {
  if (env.erpAllowDoctypeDiscovery && doctype === "DocType") {
    return;
  }
  if (!payload.allowedDocTypes.length) {
    throw new AccessDeniedError("No DocTypes configured for this user");
  }
  if (payload.allowedDocTypes.includes("*")) return;
  if (!payload.allowedDocTypes.includes(doctype)) {
    throw new AccessDeniedError(`DocType not allowed: ${doctype}`);
  }
}

export class AccessDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = "AccessDeniedError";
  }
}
