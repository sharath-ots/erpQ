"use client";

import { SettingsProvider } from "../providers/SettingsProvider.jsx";

export function SupplierDashboardProviders({ children }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
