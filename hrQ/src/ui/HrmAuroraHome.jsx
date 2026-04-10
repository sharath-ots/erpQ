"use client";

import HRM from "../components/sections/dashboards/hrm/index.jsx";
import { HrmDashboardProviders } from "./HrmDashboardProviders.jsx";

export function HrmAuroraHome() {
  return (
    <HrmDashboardProviders>
      <HRM />
    </HrmDashboardProviders>
  );
}
