import { env } from "../config.js";

/**
 * @param {string | undefined} returnUrl
 * @returns {string | null}
 */
export function resolveSafeReturnUrl(returnUrl) {
  const fallback = env.oauthDefaultReturnUrl;
  const candidate = (returnUrl && String(returnUrl).trim()) || fallback;
  if (!candidate) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch {
    return null;
  }
  for (const prefix of env.oauthReturnUrlPrefixes) {
    if (!prefix) continue;
    if (candidate.startsWith(prefix)) return candidate;
  }
  return null;
}
