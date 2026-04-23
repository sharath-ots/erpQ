/**
 * CityQ RabbitMQ topic exchange contract (cross-module communication).
 *
 * Exchange: `cityq.events` (topic, durable). Routing key = event `type` string.
 *
 * Purpose:
 * - Fan-out domain events so other modules/services can react (side effects, ERP writes,
 *   materialized views, or module-specific DB rows in the shared ERP/bounded context).
 * - Emit notification/alert events (`notifications.*`) for in-app banners, email/SMS
 *   workers, or persistence in a notifications store.
 *
 * Naming: use dotted namespaces, e.g. `crm.lead.created`, `notifications.user`,
 * `hr.employee.updated`, `pur.po.submitted`. Avoid spaces (publisher normalizes them).
 */

export const MQ_EXCHANGE = "cityq.events";

/** Topic patterns coreQ subscribes to for cross-module handling (logging / future handlers). */
export const CORE_QUEUE_BINDINGS = [
  "notifications.#",
  "crm.#",
  "hr.#",
  "pur.#",
  "portal.#",
];

/**
 * @param {string} type
 * @returns {string}
 */
export function normalizeEventType(type) {
  return String(type ?? "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Loose validation for API-published events (JWT clients).
 * @param {string} type
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateClientEventType(type) {
  const t = normalizeEventType(type);
  if (!t) return { ok: false, error: "type_required" };
  if (t.length > 200) return { ok: false, error: "type_too_long" };
  if (!/^[a-zA-Z0-9_.-]+$/.test(t)) {
    return { ok: false, error: "type_invalid" };
  }
  return { ok: true, type: t };
}
