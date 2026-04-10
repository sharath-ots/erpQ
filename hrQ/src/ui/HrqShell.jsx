"use client";

import { Alert, Typography } from "antd";
import { HrmAuroraHome } from "./HrmAuroraHome.jsx";
import { HrEntityList } from "./HrEntityList.jsx";
import { HrOtherDocTypesPage } from "./HrOtherDocTypesPage.jsx";
import { ErpDeskIframe } from "./ErpDeskIframe.jsx";
import { hrCuratedDocTypeSet, getHrListViewConfig } from "../constants/hrListViews.js";

export function HrqShell({ pathname, deskBaseUrl, deskIframeQuery, apiBase, getAccessToken }) {
  const normalized = pathname.replace(/\/$/, "") || "/m/hrq";

  if (normalized.startsWith("/m/hrq/iframe")) {
    const tail = normalized.slice("/m/hrq/iframe".length);
    const deskPath = (tail && tail.startsWith("/") ? tail : `/${tail || "app"}`).replace(/\/+$/, "");
    return <ErpDeskIframe deskBaseUrl={deskBaseUrl} path={deskPath || "/app"} deskIframeQuery={deskIframeQuery} />;
  }

  if (normalized === "/m/hrq") {
    return <HrmAuroraHome />;
  }

  if (normalized === "/m/hrq/other") {
    return <HrOtherDocTypesPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  const listMatch = normalized.match(/^\/m\/hrq\/list\/([^/]+)$/);
  if (listMatch) {
    const doctype = decodeURIComponent(listMatch[1]);
    const allowed = hrCuratedDocTypeSet();
    if (!allowed.has(doctype)) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Not a curated list"
          description={
            <>
              <Typography.Text code>{doctype}</Typography.Text> is not in the main HR menu.
              Use <strong>Other doctypes</strong> in the sidebar for arbitrary DocTypes, or add
              this DocType to{" "}
              <Typography.Text code>hrQ/src/constants/hrListViews.js</Typography.Text>.
            </>
          }
        />
      );
    }
    const cfg = getHrListViewConfig(doctype);
    return (
      <HrEntityList
        doctype={doctype}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
        title={cfg?.label}
        listFields={cfg?.listFields}
      />
    );
  }

  return <Alert type="info" message="Unknown HR path" description={pathname} />;
}
