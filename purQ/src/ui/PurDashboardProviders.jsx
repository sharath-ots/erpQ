"use client";

import { SettingsProvider } from "../providers/SettingsProvider.jsx";

export function PurDashboardProviders({ children }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
