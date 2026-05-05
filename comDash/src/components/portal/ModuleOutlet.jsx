"use client";

import dynamic from "next/dynamic";
import { Card, Empty, Spin, Typography } from "antd";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { findMenuItem } from "@/lib/menuMatch";
import { apiBase, apiFetch, getAccessToken } from "@/lib/apigate";
import CRMQ from "../../ui/components/sections/dashboards/crm-q/index"
import LeadListPage from '../../../../crmQ/pages/crm/lead-list/index'; // Update path if needed
import AddLeadScreen from "../../../../crmQ/src/ui/AddLeadScreen"; // Update path if needed
import ViewLeadScreen from "../../../../crmQ/src/ui/ViewLeadScreen"; // Update path if needed
import EditLeadPage from "../../../../crmQ/pages/crm/lead-list/edit/[id]"; // Update path if needed
//import { usePortalMenu } from "./shared-ui/PortalMenuContext";

// const CrmqShell = dynamic(
//   () => import("@cityq/crmq").then((m) => ({ default: m.CrmqShell })),
//   { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
// );

const HrqShell = dynamic(
  () => import("@cityq/hrq").then((m) => ({ default: m.HrqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

const PurqShell = dynamic(
  () => import("@cityq/purq").then((m) => ({ default: m.PurqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

export function ModuleOutlet({ menuItems = [], deskBaseUrl, deskIframeQuery }) {
  const pathname = usePathname();
  const mod = findMenuItem(menuItems, pathname);
  const lastSentRef = useRef(null);

  useEffect(() => {
    if (!mod?.key) return;
    if (lastSentRef.current === pathname) return;
    lastSentRef.current = pathname;
    apiFetch("/api/v1/mq/events", {
      method: "POST",
      body: JSON.stringify({
        type: "portal.module_viewed",
        payload: { moduleKey: mod.key, path: pathname },
      }),
    }).catch(() => {
      // Best-effort telemetry/event; ignore failures (mq may be disabled).
    });
  }, [pathname, mod?.key]);

  if (pathname.startsWith("/m/crmq")) {
    const normalized = pathname.replace(/\/$/, ""); // Strip trailing slashes

    // EXACT MATCH: Main Dashboard
    if (normalized === "/m/crmq") {
      return <CRMQ />;
    }

    // EXACT MATCH: Lead List
    if (normalized === "/m/crmq/lead-list" || normalized === "/m/crmq/list/Lead") {
      return <LeadListPage />;
    }

    // EXACT MATCH: Add Lead
    if (normalized === "/m/crmq/add-lead") {
      return <AddLeadScreen />;
    }

    // DYNAMIC MATCH: View Lead Details
    const viewLeadMatch = normalized.match(/^\/m\/crmq\/view-lead\/([^/]+)$/);
    if (viewLeadMatch) {
      return <ViewLeadScreen id={viewLeadMatch[1]} />;
    }

    const editLeadMatch = normalized.match(/^\/m\/crmq\/edit-lead\/([^/]+)$/);
    if (editLeadMatch) {
      return <EditLeadPage id={editLeadMatch[1]} />;
    }

    // FALLBACK: If the route is missing
    return (
      <Card>
        <Typography.Title level={4}>CRM Page Not Found</Typography.Title>
        <Typography.Paragraph>No matching CRM route for: {pathname}</Typography.Paragraph>
      </Card>
    );
  }

  if (!mod) {
    return (
      <Card>
        <Typography.Title level={4}>Welcome</Typography.Title>
        <Typography.Paragraph type="secondary">
          Select a module from the sidebar. If menus are empty, confirm{" "}
          <Typography.Text code>ERPNEXT_URL</Typography.Text> is passed to apiGate and you are
          logged in with a valid JWT.
        </Typography.Paragraph>
      </Card>
    );
  }



  if (pathname.startsWith("/m/hrq")) {
    return (
      <HrqShell
        pathname={pathname}
        deskBaseUrl={deskBaseUrl ?? undefined}
        deskIframeQuery={deskIframeQuery ?? undefined}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
      />
    );
  }

  if (pathname.startsWith("/m/purq")) {
    return (
      <PurqShell
        pathname={pathname}
        deskBaseUrl={deskBaseUrl ?? undefined}
        deskIframeQuery={deskIframeQuery ?? undefined}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
      />
    );
  }

  if (mod.externalUrl && !mod.path) {
    return (
      <Card title={mod.label}>
        <Typography.Paragraph>
          Open{" "}
          <Typography.Link href={mod.externalUrl} target="_blank" rel="noreferrer">
            {mod.label}
          </Typography.Link>{" "}
          (external module).
        </Typography.Paragraph>
      </Card>
    );
  }

  return (
    <Card title={mod.label}>
      <Empty
        description={`Custom workflow shell for "${mod.key}" — add a page under comDash or point embedUrl from apiGate /api/v1/portal/menu.`}
      />
    </Card>
  );
}
