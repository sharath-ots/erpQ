"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import BreakpointsProvider from "providers/BreakpointsProvider";
import LocalizationProvider from "providers/LocalizationProvider";
import NotistackProvider from "providers/NotistackProvider";
import SettingsProvider from "providers/SettingsProvider";
import ThemeProvider from "providers/ThemeProvider";
import VisionModeProvider from "providers/VisionModeProvider";

/**
 * Portal shell: MUI App Router cache, theme, i18n, notifications, breakpoints.
 * Auth is CityQ JWT (no next-auth session).
 */
export function PortalRootShell({ children }) {
  return (
    <>
      <InitColorSchemeScript
        attribute="data-aurora-color-scheme"
        modeStorageKey="aurora-mode"
      />
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <SettingsProvider>
          <LocalizationProvider>
            <ThemeProvider>
              <VisionModeProvider>
                <NotistackProvider>
                  <BreakpointsProvider>{children}</BreakpointsProvider>
                </NotistackProvider>
              </VisionModeProvider>
            </ThemeProvider>
          </LocalizationProvider>
        </SettingsProvider>
      </AppRouterCacheProvider>
    </>
  );
}
