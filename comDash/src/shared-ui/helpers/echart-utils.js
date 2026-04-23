export const tooltipFormatterList = (params, showLabel = false) => {
  const paramsArray = Array.isArray(params) ? params : [params];

  const result = paramsArray.map((param) => {
    const hasSeriesName = !(
      typeof param.seriesName === 'string' && /^series\u0000\d+$/.test(param.seriesName)
    );

    const formattedValue =
      typeof param.value === 'number'
        ? Math.abs(param.value) > 1000
          ? (param.value / 1000).toFixed(1) + 'K'
          : param.value
        : param.value;

    return {
      value: formattedValue,
      color: param.color,
      seriesName: hasSeriesName ? param.seriesName : param.name,
    };
  });

  const tooltipItem = result
    .map((el) => {
      return `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 120px">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="width: 8px; height: 8px; background: ${el.color}; border-radius: 50%;"></span>
          <span>${el.seriesName}</span>
        </div>
        <span>${el.value}</span>
      </div>`;
    })
    .join('');

  return showLabel
    ? `<div style="margin-left: 8px;">
         <p>${paramsArray[0].name}</p>
          ${tooltipItem}
    </div>`
    : `<div style="margin-left: 8px;">
          ${tooltipItem}
    </div>`;
};

/**
 * Convert CSS4 space-separated color syntax to traditional comma syntax for echarts compatibility.
 * e.g. 'rgba(195 211 219 / 0.6)' → 'rgba(195, 211, 219, 0.6)'
 *      'rgb(195 211 219)'        → 'rgb(195, 211, 219)'
 */
function normalizeCssColor(color) {
  if (!color || typeof color !== 'string') return color;
  const m = color.match(/^(rgba?)\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const [, fn, r, g, b, a] = m;
    if (fn.toLowerCase() === 'rgba' || a !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${a ?? 1})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
}

export function getColor(colorVar) {
  if (colorVar == null || typeof colorVar !== 'string') return colorVar;
  const isVar = colorVar.startsWith('var(') && colorVar.endsWith(')');
  if (!isVar) return normalizeCssColor(colorVar);
  if (typeof window === 'undefined') return colorVar;

  const variableName = colorVar.slice(4, -1).trim();
  const computedStyle = getComputedStyle(document.documentElement);
  const resolved = computedStyle.getPropertyValue(variableName).trim();

  return normalizeCssColor(resolved || colorVar);
}
