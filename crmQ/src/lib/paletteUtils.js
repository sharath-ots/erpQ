/**
 * Safe accessor for Aurora custom palette channels (chGrey, chBlue, chGreen, etc.).
 * When comDash's full Aurora ThemeProvider is active these exist; fall back to
 * generic MUI tokens so the chart still renders without crashing.
 */
export function safePalette(palette = {}) {
  const fallbackChannel = "200 200 200"; // neutral grey channel

  const makeScale = (fallbackHex = "#999") =>
    new Proxy(
      {},
      {
        get(_, key) {
          if (String(key).endsWith("Channel")) return fallbackChannel;
          return fallbackHex;
        },
      },
    );

  return {
    chGrey: palette.chGrey ?? makeScale("#888"),
    chBlue: palette.chBlue ?? makeScale("#3f8ef5"),
    chGreen: palette.chGreen ?? makeScale("#22c55e"),
    chOrange: palette.chOrange ?? makeScale("#f97316"),
    chLightBlue: palette.chLightBlue ?? makeScale("#38bdf8"),
    divider: palette.divider ?? "rgba(0,0,0,0.12)",
    dividerLight: palette.dividerLight ?? "rgba(0,0,0,0.06)",
    menuDivider: palette.menuDivider ?? "rgba(0,0,0,0.08)",
    text: palette.text ?? { disabled: "#aaa", secondary: "#666" },
  };
}
