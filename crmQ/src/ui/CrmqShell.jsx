"use client";

import { Alert, Typography } from "antd";
import { CrmHome } from "./CrmHome.jsx";
import { CrmEntityList } from "./CrmEntityList.jsx";
import { CrmOtherDocTypesPage } from "./CrmOtherDocTypesPage.jsx";
import { ErpDeskIframe } from "./ErpDeskIframe.jsx";
import {
  curatedDocTypeSet,
  getListViewConfig,
} from "../constants/crmListViews.js";
import CRMDashboard from "../../pages/crm/index.jsx";
/**
 * Routes under /m/crmq/* — comDash sidebar; curated lists + optional ERPNext desk iframe.
 */
export function CrmqShell({
  pathname,
  deskBaseUrl,
  deskIframeQuery,
  apiBase,
  getAccessToken,
}) {
  const normalized = pathname.replace(/\/$/, "") || "/m/crmq";

  if (normalized.startsWith("/m/crmq/iframe")) {
    const tail = normalized.slice("/m/crmq/iframe".length);
    const deskPath = (tail && tail.startsWith("/") ? tail : `/${tail || "app"}`).replace(
      /\/+$/,
      "",
    );
    const iframePath = deskPath || "/app";
    return <ErpDeskIframe deskBaseUrl={deskBaseUrl} path={iframePath} />;
  }

  if (normalized === "/m/crmq") {
    return <CRMDashboard />;
  }

  if (normalized === "/m/crmq/other") {
    return (
      <CrmOtherDocTypesPage
        apiBase={apiBase}
        getAccessToken={getAccessToken}
      />
    );
  }

  const listMatch = normalized.match(/^\/m\/crmq\/list\/([^/]+)$/);
  if (listMatch) {
    const doctype = decodeURIComponent(listMatch[1]);
    const allowed = curatedDocTypeSet();
    if (!allowed.has(doctype)) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Not a curated list"
          description={
            <>
              <Typography.Text code>{doctype}</Typography.Text> is not opened here. Use{" "}
              <strong>Other doctypes</strong> in the sidebar for arbitrary DocTypes, or add this
              DocType to curated views in{" "}
              <Typography.Text code>crmQ/src/constants/crmListViews.js</Typography.Text> (and the
              matching menu in apiGate <Typography.Text code>portal.js</Typography.Text>).
            </>
          }
        />
      );
    }
    const cfg = getListViewConfig(doctype);
    return (
      <CrmEntityList
        doctype={doctype}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
        title={cfg?.label}
        listFields={cfg?.listFields}
      />
    );
  }

  return (
    <Alert
      type="info"
      message="Unknown CRM path"
      description={pathname}
    />
  );
}
