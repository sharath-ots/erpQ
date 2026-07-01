"use client";

import { Alert, Collapse, Typography } from "antd";
import { DocTypeExplorer } from "./DocTypeExplorer.jsx";

export function SupplierOtherDocTypesPage({ apiBase, getAccessToken }) {
  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="Other doctypes"
        description="Use this screen for DocTypes not in the main Supplier Portal menu."
      />
      <Collapse
        items={[{
          key: "desk",
          label: "ERPNext supplier desk (iframe)",
          children: (
            <Typography.Paragraph className="!mb-0">
              For full ERPNext supplier workflows, use the desk iframe entry or configure{" "}
              <Typography.Text code>ERPNEXT_PUBLIC_URL</Typography.Text> on apiGate.
            </Typography.Paragraph>
          ),
        }]}
      />
      <DocTypeExplorer apiBase={apiBase} getAccessToken={getAccessToken} />
    </div>
  );
}
