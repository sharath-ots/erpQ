/**
 * In-memory OAuth state for PKCE verifier + return URL.
 * For multi-instance production, replace with Redis or similar.
 */

const TTL_MS = 10 * 60 * 1000;
const store = new Map();

export function saveOAuthState(key, value) {
  const exp = Date.now() + TTL_MS;
  store.set(key, { ...value, exp });
}

export function takeOAuthState(key) {
  const row = store.get(key);
  store.delete(key);
  if (!row || row.exp < Date.now()) return null;
  return row;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.exp < now) store.delete(k);
  }
}, 60_000).unref?.();
