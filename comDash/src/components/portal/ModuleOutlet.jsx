"use client";

import dynamic from "next/dynamic";
import { Button, Card, Empty, Spin, Typography } from "antd"; 
import { usePathname, useRouter } from "next/navigation"; 
import { useEffect, useRef } from "react"; 
import { findMenuItem } from "@/lib/menuMatch";
import { apiBase, apiFetch, getAccessToken, parseCityQJwtPayload } from "@/lib/apigate";
import CRMQ from "../../ui/components/sections/dashboards/crm-q/index"
import LeadListPage from '../../../../crmQ/pages/crm/lead-list/index';
import AddLeadScreen from "../../../../crmQ/src/ui/AddLeadScreen";
import ViewLeadScreen from "../../../../crmQ/src/ui/ViewLeadScreen";
import EditLeadPage from "../../../../crmQ/pages/crm/lead-list/edit/[id]";
import DocDashboard from "../../ui/components/sections/doc-q/DocDashboard";
import DocWorkflowsAdmin from "../../ui/components/sections/doc-q/DocWorkflowsAdmin";
import DocFileRegister from "../../ui/components/sections/doc-q/DocFileRegister";
import DocErpNextLinker from "../../ui/components/sections/doc-q/DocErpNextLinker";
import DocLibrary from "../../ui/components/sections/doc-q/DocLibrary";
import DocMyDocuments from "../../ui/components/sections/doc-q/DocMyDocuments";
import DocWorkflowSetup from "../../ui/components/sections/doc-q/DocWorkflowSetup";
import DocInbox from "../../ui/components/sections/doc-q/DocInbox";
import DocNewUpload from "../../ui/components/sections/doc-q/DocNewUpload";
import DocDetail from "../../ui/components/sections/doc-q/DocDetail";
import DocTypeAdmin from "../../ui/components/sections/doc-q/DocTypeAdmin";
import DocProjectsAdmin from "../../ui/components/sections/doc-q/DocProjectsAdmin";
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
import { usePortalMenu } from "./PortalMenuProvider";
import { useERPUser } from '../../ui/providers/ERPUserProvider';
import ChatPage from "../../../../crmQ/ai/chat-bot/ChatPage";

const HrqShell = dynamic(
  () => import("@cityq/hrq").then((m) => ({ default: m.HrqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

const PurqShell = dynamic(
  () => import("@cityq/purq").then((m) => ({ default: m.PurqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

const SupplierqShell = dynamic(
  () => import("@cityq/supplierq").then((m) => ({ default: m.SupplierqShell })),
  { ssr: false, loading: () => <Spin style={{ display: "block", margin: "40px auto" }} /> },
);

export function ModuleOutlet({ menuItems: menuItemsProp = [], deskBaseUrl: deskBaseUrlProp, deskIframeQuery: deskIframeQueryProp }) {
  const pathname = usePathname();
  const router = useRouter(); 
  const portalMenu = usePortalMenu();
  
  const menuItems = menuItemsProp.length ? menuItemsProp : (portalMenu.menuItems ?? []);
  const deskBaseUrl = deskBaseUrlProp ?? portalMenu.deskBaseUrl;
  const deskIframeQuery = deskIframeQueryProp ?? portalMenu.deskIframeQuery;
  const mod = findMenuItem(menuItems, pathname);
  
  const lastSentRef = useRef(null);
  
  const { isDark } = useThemeMode(); 
  const { roles, loading } = useERPUser();

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
    }).catch(() => {});
  }, [pathname, mod?.key]);


  // =========================================================================
  // ACCESS DENIED RENDERING (Supplier Logic Only)
  // =========================================================================
  
  if (loading) {
    return <div style={{ height: '100vh', width: '100vw', background: isDark ? '#141414' : '#f4f5f7' }} />;
  }

  // Strictly check Supplier Roles
  const isSupplierUser = roles.includes("Supplier Portal User");
  const isSupplierPath = pathname.startsWith("/m/supplierq");

  const renderAccessDenied = (message, redirectPath, buttonLabel) => (
    <div style={{
      position: 'fixed', 
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: isDark ? '#141414' : '#f4f5f7' 
    }}>
      <div style={{
        background: isDark ? '#1f1f1f' : '#ffffff',
        padding: '36px 32px',
        textAlign: 'center',
        minWidth: '450px',
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.04)',
        borderRadius: '8px',
      }}>
        <Typography.Title level={4} style={{ color: '#ff4d4f', margin: '0 0 16px 0', fontWeight: 500 }}>
          Access Denied
        </Typography.Title>
        <Typography.Paragraph style={{ margin: '0 0 24px 0', fontSize: '14px', color: isDark ? 'rgba(255,255,255,0.85)' : '#333' }}>
          {message}
        </Typography.Paragraph>

        {redirectPath && (
          <Button 
            type="primary" 
            size="large" 
            onClick={() => router.push(redirectPath)}
            style={{ borderRadius: '6px' }}
          >
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );

  // 1. Supplier Trapped in SupplierQ
  if (isSupplierUser && !isSupplierPath) {
    return renderAccessDenied("Your account profile only has access to the Supplier Portal.", "/m/supplierq", "Return to Supplier Portal");
  }
  
  // 2. Normal Users Trapped OUT of SupplierQ
  if (!isSupplierUser && isSupplierPath) {
    return renderAccessDenied("You do not have permission to access the Supplier Portal.", "/m/crmq", "Return to CRM");
  }

  // =========================================================================
  // NORMAL ROUTING
  // =========================================================================

  if (pathname.startsWith("/m/crmq")) {
    const normalized = pathname.replace(/\/$/, ""); 

    if (normalized === "/m/crmq") return <CRMQ />;
    if (normalized === "/m/crmq/lead-list" || normalized === "/m/crmq/list/Lead") return <LeadListPage />;
    if (normalized === "/m/crmq/add-lead") return <AddLeadScreen />;
    if (normalized === "/m/crmq/ai") return <ChatPage />;

    const viewLeadMatch = normalized.match(/^\/m\/crmq\/view-lead\/([^/]+)$/);
    if (viewLeadMatch) return <ViewLeadScreen id={viewLeadMatch[1]} />;

    const editLeadMatch = normalized.match(/^\/m\/crmq\/edit-lead\/([^/]+)$/);
    if (editLeadMatch) return <EditLeadPage id={editLeadMatch[1]} />;

    if (normalized === "/m/crmq/landing") return <CommingSoonPage />;
    if (normalized === "/m/crmq/kanban") return <KanbanRoute />
    if (normalized === "/m/crmq/opportunity-list") return <OpportunityListPage />
    if (normalized === "/m/crmq/add-opportunity") return <AddOpportunityScreen />

    const editOpportunityMatch = normalized.match(/^\/m\/crmq\/edit-opportunity\/([^/]+)$/);
    if (editOpportunityMatch) return <EditOpportunityPage id={editOpportunityMatch[1]} />;

    const viewOpportunityMatch = normalized.match(/^\/m\/crmq\/view-opportunity\/([^/]+)$/);
    if (viewOpportunityMatch) return <ViewOpportunityScreen id={viewOpportunityMatch[1]} />;

    return (
      <Card>
        <Typography.Title level={4}>CRM Page Not Found</Typography.Title>
        <Typography.Paragraph>No matching CRM route for: {pathname}</Typography.Paragraph>
      </Card>
    );
  }

  if (/^\/m\/docq/i.test(pathname)) {
    const normalized = pathname.replace(/^\/m\/docq/i, "/m/docq").replace(/\/$/, "");
    if (normalized === "/m/docq") return <DocMyDocuments />;
    if (normalized === "/m/docq/scratch" || normalized === "/m/docq/register") return <DocFileRegister />;
    if (normalized === "/m/docq/documents") return <DocLibrary view="all" />;
    if (normalized === "/m/docq/my-documents") return <DocMyDocuments />;
    if (normalized === "/m/docq/shared-with-me") return <DocLibrary view="shared_with_me" />;
    if (normalized === "/m/docq/shared-by-me") return <DocLibrary view="shared_by_me" />;
    if (normalized === "/m/docq/changes-requested") return <DocLibrary view="changes_requested" />;
    if (normalized === "/m/docq/for-review") return <DocLibrary view="for_review" showActions />;
    if (normalized === "/m/docq/for-approval") return <DocLibrary view="for_approval" showActions />;
    if (normalized === "/m/docq/revoke") return <DocLibrary view="revocable" showActions />;
    if (normalized === "/m/docq/archived") return <DocLibrary view="archived" />;
    if (normalized === "/m/docq/inbox") return <DocLibrary view="for_review" showActions />;
    if (normalized === "/m/docq/new") return <DocNewUpload />;
    if (normalized === "/m/docq/admin/doc-types") {
      const admin = parseCityQJwtPayload(getAccessToken())?.isDocAdmin;
      if (!admin) return <Card><Typography.Title level={4}>Admin only</Typography.Title></Card>;
      return <DocTypeAdmin />;
    }
    if (normalized === "/m/docq/admin/workflows") {
      const admin = parseCityQJwtPayload(getAccessToken())?.isDocAdmin;
      if (!admin) return <Card><Typography.Title level={4}>Admin only</Typography.Title></Card>;
      return <DocWorkflowSetup />;
    }
    if (normalized === "/m/docq/admin/projects") {
      const admin = parseCityQJwtPayload(getAccessToken())?.isDocAdmin;
      if (!admin) return <Card><Typography.Title level={4}>Admin only</Typography.Title></Card>;
      return <DocProjectsAdmin />;
    }

    if (normalized === "/m/docq/erpnext-link") return <DocErpNextLinker />;

    const detailMatch = normalized.match(/^\/m\/docq\/documents\/([^/]+)$/);
    if (detailMatch) {
      return <DocDetail documentId={detailMatch[1]} />;
    }

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
      return <EmailLayout><Email /></EmailLayout>;
    }

    const detailsMatch = pathname.match(/^\/m\/emailq\/email\/details\/([^/]+)\/([^/]+)$/);
    if (detailsMatch) {
      return <EmailLayout><EmailDetails /></EmailLayout>;
    }

    return <EmailLayout><Email /></EmailLayout>;
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

  if (pathname.startsWith("/m/supplierq")) {
    return (
      <SupplierqShell
        pathname={pathname}
        deskBaseUrl={deskBaseUrl ?? undefined}
        deskIframeQuery={deskIframeQuery ?? undefined}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
      />
    );
  }

  if (!mod) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "70vh",
        background: isDark ? '#18181b' : '#ffffff',
        borderRadius: "12px",
        border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
        padding: "48px",
        textAlign: "center",
        boxShadow: "none" 
      }}>
        <div style={{
          width: "64px", height: "64px",
          background: isDark ? '#27272a' : '#f4f4f5',
          borderRadius: "8px", 
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "24px"
        }}>
          <span style={{ fontSize: "28px" }}>🚀</span>
        </div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Welcome to ERP-Q
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: "12px", maxWidth: "400px" }}>
          Your central workspace is ready. Select a module from the sidebar to start managing your workflow.
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