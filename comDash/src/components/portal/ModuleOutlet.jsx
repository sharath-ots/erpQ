"use client";

import dynamic from "next/dynamic";
import { Card, Empty, Spin, Typography } from "antd";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { findMenuItem } from "@/lib/menuMatch";
import { apiBase, apiFetch, getAccessToken } from "@/lib/apigate";
import { usePortalMenu } from "./shared-ui/PortalMenuContext";

const CrmqShell = dynamic(
  () => import("@cityq/crmq").then((m) => ({ default: m.CrmqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

const HrqShell = dynamic(
  () => import("@cityq/hrq").then((m) => ({ default: m.HrqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

const PurqShell = dynamic(
  () => import("@cityq/purq").then((m) => ({ default: m.PurqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

export function ModuleOutlet() {
  const { menuItems, deskBaseUrl, deskIframeQuery } = usePortalMenu();
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
