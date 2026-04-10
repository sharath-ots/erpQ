export function cssVarRgba(channel, alpha) {
  // Accepts either "r g b" or "r g b / a" style channels.
  return `rgba(${channel} / ${alpha})`;
}

export function getPastDates(count, unit = "day") {
  const out = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    if (unit === "day") d.setDate(now.getDate() - i);
    if (unit === "month") d.setMonth(now.getMonth() - i);
    out.push(d);
  }
  return out;
}

