"use client";

import { SettingsProvider } from "../providers/SettingsProvider.jsx";
import { BreakpointsProvider } from "../providers/BreakpointsProvider.jsx";

export function HrmDashboardProviders({ children }) {
  return (
    <SettingsProvider>
      <BreakpointsProvider>
        {children}
      </BreakpointsProvider>
    </SettingsProvider>
  );
}
