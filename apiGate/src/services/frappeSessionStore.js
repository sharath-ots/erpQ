/** In-memory Frappe sid cookie per logged-in user (use Redis in production, multi-instance). */
const sidByEmail = new Map();

export function setFrappeSidForUser(email, cookieHeader) {
  sidByEmail.set(email.trim().toLowerCase(), cookieHeader);
}

export function getFrappeSidForUser(email) {
  return sidByEmail.get(email.trim().toLowerCase());
}

export function clearFrappeSidForUser(email) {
  sidByEmail.delete(email.trim().toLowerCase());
}
