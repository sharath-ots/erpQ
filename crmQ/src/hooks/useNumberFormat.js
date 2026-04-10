"use client";

/**
 * Aurora-compatible API: returns `{ numberFormat }` (not a bare function).
 */
export default function useNumberFormat() {
  function numberFormat(value, options) {
    if (value == null) return "—";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
      ...options,
    }).format(n);
  }

  return { numberFormat };
}
