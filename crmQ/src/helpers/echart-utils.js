export function tooltipFormatterList(params) {
  if (!Array.isArray(params)) return "";
  return params
    .map((p) => {
      const name = p?.seriesName ?? "";
      const value = p?.value ?? "";
      return `${name}: ${value}`;
    })
    .join("<br/>");
}

