"use client";

import dynamic from "next/dynamic";
import { Card, Empty, Spin, Typography } from "antd";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { findMenuItem } from "@/lib/menuMatch";
import { apiBase, apiFetch, getAccessToken } from "@/lib/apigate";
import CRMQ from "../../ui/components/sections/dashboards/crm-q/index"
import LeadListPage from '../../../../crmQ/pages/crm/lead-list/index';
import AddLeadScreen from "../../../../crmQ/src/ui/AddLeadScreen";
import ViewLeadScreen from "../../../../crmQ/src/ui/ViewLeadScreen";
import EditLeadPage from "../../../../crmQ/pages/crm/lead-list/edit/[id]";
import DocDashboard from "../../ui/components/sections/doc-q/DocDashboard";
import DocWorkflowsAdmin from "../../ui/components/sections/doc-q/DocWorkflowsAdmin";
import DocFileRegister from "../../ui/components/sections/doc-q/DocFileRegister";
import DocErpNextLinker from "../../ui/components/sections/doc-q/DocErpNextLinker";
import { useThemeMode } from '../../ui/hooks/useThemeMode';
import EmailLayout from '../../../../crmQ/src/layouts/email-layout/index';
import EmailDetails from '../../../../crmQ/components/email-app/email/EmailDetails';
import Email from '../../../../crmQ/components/email-app/email/Email';
import CommingSoonPage from '../../../../crmQ/pages/landing/comming_soon/index';
import KanbanRoute from '../../../../crmQ/pages/crm/kanban/index';
import OpportunityListPage from '../../../../crmQ/pages/crm/opportunity/index'
import AddOpportunityScreen from "../../../../crmQ/src/ui/AddOpportunityScreen";
import EditOpportunityPage from "../../../../crmQ/pages/crm/opportunity/edit/[id]"
import ViewOpportunityScreen from "../../../../crmQ/src/ui/ViewOpportunityScreen";
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

    if (normalized === "/m/crmq/landing") {
      return <CommingSoonPage />;
    }

    if (normalized === "/m/crmq/kanban") {
      return <KanbanRoute />
    }

    if (normalized === "/m/crmq/opportunity-list") {
      return <OpportunityListPage />
    }

    if (normalized === "/m/crmq/add-opportunity") {
      return <AddOpportunityScreen />
    }

    const editOpportunityMatch = normalized.match(/^\/m\/crmq\/edit-opportunity\/([^/]+)$/);
    if (editOpportunityMatch) {
      return <EditOpportunityPage id={editOpportunityMatch[1]} />;
    }

    const viewOpportunityMatch = normalized.match(/^\/m\/crmq\/view-opportunity\/([^/]+)$/);
    if (viewOpportunityMatch) {
      return <ViewOpportunityScreen id={viewOpportunityMatch[1]} />;
    }

    // FALLBACK: If the route is missing
    return (
      <Card>
        <Typography.Title level={4}>CRM Page Not Found</Typography.Title>
        <Typography.Paragraph>No matching CRM route for: {pathname}</Typography.Paragraph>
      </Card>
    );
  }

  if (pathname.startsWith("/m/docq")) {
    const normalized = pathname.replace(/\/$/, "");
    if (normalized === "/m/docq") return <DocDashboard />;
    if (normalized === "/m/docq/register") return <DocFileRegister />;
    if (normalized === "/m/docq/admin/workflows") return <DocWorkflowsAdmin />;
    if (normalized === "/m/docq/erpnext-link") return <DocErpNextLinker />;

    return (
      <Card>
        <Typography.Title level={4}>Documents Page Not Found</Typography.Title>
        <Typography.Paragraph>No matching Documents route for: {pathname}</Typography.Paragraph>
      </Card>
    );
  }

  if (pathname.startsWith("/m/emailq/email")) {
    const listMatch = pathname.match(/^\/m\/emailq\/email\/list\/([^/]+)$/);
    if (listMatch) {
      return (
        <EmailLayout>
          <Email />
        </EmailLayout>
      );
    }

    const detailsMatch = pathname.match(/^\/m\/emailq\/email\/details\/([^/]+)\/([^/]+)$/);
    if (detailsMatch) {
      return (
        <EmailLayout>
          <EmailDetails />
        </EmailLayout>
      );
    }

    return (
      <EmailLayout>
        <Email />
      </EmailLayout>
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
  const { isDark } = useThemeMode();
  if (!mod) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "70vh",
        // 🚀 DYNAMIC BACKGROUND GRADIENT
        background: isDark
          ? "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
        borderRadius: "16px",
        // 🚀 DYNAMIC BORDER
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: isDark ? "0 10px 40px rgba(0,0,0,0.3)" : "0 10px 40px rgba(0,0,0,0.03)",
        padding: "40px", textAlign: "center", position: "relative",
        overflow: "hidden"
      }}>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.4; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes slide-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Animated Icon Container */}
        <div style={{ position: "relative", marginBottom: "32px", animation: "float 4s ease-in-out infinite" }}>
          {/* Pulsing ring */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: "50%", background: "#1677ff",
            animation: "pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite"
          }} />
          {/* Floating Circle */}
          <div style={{
            width: "88px", height: "88px",
            // 🚀 DYNAMIC CIRCLE BACKGROUND
            background: isDark ? "#1e293b" : "#ffffff",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isDark ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 8px 24px rgba(22, 119, 255, 0.15)",
            position: "relative", zIndex: 1
          }}>
            <span style={{ fontSize: "40px" }}>🚀</span>
          </div>
        </div>

        {/* Staggered Text Animations */}
        {/* 🚀 REMOVED hardcoded color="#1e293b" so Ant Design automatically handles it! */}
        <Typography.Title level={2} style={{ margin: 0, animation: "slide-up 0.6s ease-out both" }}>
          Welcome to ERP-Q
        </Typography.Title>

        <Typography.Paragraph type="secondary" style={{
          fontSize: "16px", maxWidth: "500px", marginTop: "16px", lineHeight: "1.6",
          animation: "slide-up 0.8s ease-out both", animationDelay: "0.1s"
        }}>
          Your central workspace is ready. Select a module from the sidebar on the left to start managing your workflow.
        </Typography.Paragraph>
      </div>
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