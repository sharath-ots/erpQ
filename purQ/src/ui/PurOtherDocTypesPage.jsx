"use client";

import { Alert, Collapse, Typography } from "antd";
import { DocTypeExplorer } from "./DocTypeExplorer.jsx";

export function PurOtherDocTypesPage({ apiBase, getAccessToken }) {
  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="Other doctypes"
        description={
          <>
            Use this screen only for DocTypes not in the main Purchasing menu.
            First-class purchasing views (Suppliers, Purchase Orders, …) are built in-app.
          </>
        }
      />
      <Collapse
        items={[{
          key: "nginx",
          label: "Optional: allow ERPNext desk in an iframe (nginx / CSP)",
          children: (
            <Typography.Paragraph className="!mb-0">
              On the <strong>ERPNext server</strong>, adjust nginx to allow framing from your
              portal origin. See the HR module documentation for details.
            </Typography.Paragraph>
          ),
        }]}
      />
      <DocTypeExplorer apiBase={apiBase} getAccessToken={getAccessToken} />
    </div>
  );
}
