"use client";

import { SettingsProvider } from "../providers/SettingsProvider.jsx";

export function CrmDashboardProviders({ children }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

