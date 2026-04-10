"use client";

/**
 * Aurora-style CRM home (MUI + charts) — source lives under
 * `crmQ/src/components/sections/dashboards/crm` (copied from template, not imported at runtime).
 */
import CRM from "../components/sections/dashboards/crm/index.jsx";
import { CrmDashboardProviders } from "./CrmDashboardProviders.jsx";

export function CrmAuroraHome() {
  return (
    <CrmDashboardProviders>
      <CRM />
    </CrmDashboardProviders>
  );
}
