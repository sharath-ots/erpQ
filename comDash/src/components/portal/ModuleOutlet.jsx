"use client";

import dynamic from "next/dynamic";
import { Card, Empty, Spin, Typography } from "antd";
import { usePathname } from "next/navigation";
import { findMenuItem } from "@/lib/menuMatch";
import { apiBase, getAccessToken } from "@/lib/apigate";
import { usePortalMenu } from "./aurora/PortalMenuContext";

const CrmqShell = dynamic(
  () => import("@cityq/crmq").then((m) => ({ default: m.CrmqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

/** Aurora CRM dashboard (same layout as aurora_ui `dashboard/crm`) — portal home for `/m/crmq` only. */
const AuroraCrmDashboard = dynamic(
  () => import("components/sections/dashboards/crm"),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

export function ModuleOutlet() {
  const { menuItems, deskBaseUrl, deskIframeQuery } = usePortalMenu();
  const pathname = usePathname();
  const mod = findMenuItem(menuItems, pathname);
  const pathNorm = pathname.replace(/\/$/, "") || "/";

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

  if (pathNorm === "/m/crmq") {
    return <AuroraCrmDashboard />;
  }

  if (pathname.startsWith("/m/crmq")) {
    return (
      <CrmqShell
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
