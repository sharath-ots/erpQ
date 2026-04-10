"use client";

import PUR from "../components/sections/dashboards/pur/index.jsx";
import { PurDashboardProviders } from "./PurDashboardProviders.jsx";

export function PurAuroraHome() {
  return (
    <PurDashboardProviders>
      <PUR />
    </PurDashboardProviders>
  );
}
