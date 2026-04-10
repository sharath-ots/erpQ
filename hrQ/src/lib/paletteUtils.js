/**
 * Safe accessor for Aurora custom palette channels (chGrey, chBlue, chGreen, chRed, etc.).
 * Provides fallbacks so charts render without crashing if Aurora ThemeProvider is absent.
 */
export function safePalette(palette = {}) {
  const fallbackChannel = "200 200 200";
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
    chRed: palette.chRed ?? makeScale("#ef4444"),
    chLightBlue: palette.chLightBlue ?? makeScale("#38bdf8"),
    divider: palette.divider ?? "rgba(0,0,0,0.12)",
    dividerLight: palette.dividerLight ?? "rgba(0,0,0,0.06)",
    menuDivider: palette.menuDivider ?? "rgba(0,0,0,0.08)",
    text: palette.text ?? { disabled: "#aaa", secondary: "#666" },
    background: {
      paper: palette.background?.paper ?? "#fff",
      default: palette.background?.default ?? "#f5f5f5",
      elevation1: palette.background?.elevation1 ?? "#fafafa",
      elevation2: palette.background?.elevation2 ?? "#f0f0f0",
      ...(palette.background ?? {}),
    },
  };
}
