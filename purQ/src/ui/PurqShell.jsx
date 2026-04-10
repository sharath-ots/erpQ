"use client";

import { Alert, Typography } from "antd";
import { PurAuroraHome } from "./PurAuroraHome.jsx";
import { PurEntityList } from "./PurEntityList.jsx";
import { PurOtherDocTypesPage } from "./PurOtherDocTypesPage.jsx";
import { ErpDeskIframe } from "./ErpDeskIframe.jsx";
import { purCuratedDocTypeSet, getPurListViewConfig } from "../constants/purListViews.js";

export function PurqShell({ pathname, deskBaseUrl, deskIframeQuery, apiBase, getAccessToken }) {
  const normalized = pathname.replace(/\/$/, "") || "/m/purq";

  if (normalized.startsWith("/m/purq/iframe")) {
    const tail = normalized.slice("/m/purq/iframe".length);
    const deskPath = (tail && tail.startsWith("/") ? tail : `/${tail || "app"}`).replace(/\/+$/, "");
    return <ErpDeskIframe deskBaseUrl={deskBaseUrl} path={deskPath || "/app"} deskIframeQuery={deskIframeQuery} />;
  }

  if (normalized === "/m/purq") {
    return <PurAuroraHome />;
  }

  if (normalized === "/m/purq/other") {
    return <PurOtherDocTypesPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  const listMatch = normalized.match(/^\/m\/purq\/list\/([^/]+)$/);
  if (listMatch) {
    const doctype = decodeURIComponent(listMatch[1]);
    const allowed = purCuratedDocTypeSet();
    if (!allowed.has(doctype)) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Not a curated list"
          description={
            <>
              <Typography.Text code>{doctype}</Typography.Text> is not in the main Purchasing menu.
              Use <strong>Other doctypes</strong> in the sidebar, or add this DocType to{" "}
              <Typography.Text code>purQ/src/constants/purListViews.js</Typography.Text>.
            </>
          }
        />
      );
    }
    const cfg = getPurListViewConfig(doctype);
    return (
      <PurEntityList
        doctype={doctype}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
        title={cfg?.label}
        listFields={cfg?.listFields}
      />
    );
  }

  return <Alert type="info" message="Unknown Purchasing path" description={pathname} />;
}
