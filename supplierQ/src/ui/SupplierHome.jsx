"use client";

import SupplierDashboard from "../components/sections/dashboards/supplier/index.jsx";
import { SupplierDashboardProviders } from "./SupplierDashboardProviders.jsx";

export function SupplierHome({ apiBase, getAccessToken }) {
  return (
    <SupplierDashboardProviders>
      <SupplierDashboard apiBase={apiBase} getAccessToken={getAccessToken} />
    </SupplierDashboardProviders>
  );
}
