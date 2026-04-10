"use client";

/**
 * Aurora-compatible API: returns { numberFormat, currencyFormat }.
 */
export default function useNumberFormat() {
  function numberFormat(value, options) {
    if (value == null) return "\u2014";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
      ...options,
    }).format(n);
  }

  function currencyFormat(value, options) {
    if (value == null) return "\u2014";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
      ...options,
    }).format(n);
  }

  return { numberFormat, currencyFormat };
}
