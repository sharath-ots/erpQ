"use client";

import { Alert, Collapse, Typography } from "antd";
import { DocTypeExplorer } from "./DocTypeExplorer.jsx";

export function HrOtherDocTypesPage({ apiBase, getAccessToken }) {
  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="Other doctypes"
        description={
          <>
            Use this screen only for DocTypes that are not in the main HR menu. First-class HR
            views (Employees, Departments, …) are built in-app and do not use an ERPNext iframe.
          </>
        }
      />
      <Collapse
        items={[{
          key: "nginx",
          label: "Optional: allow ERPNext desk in an iframe (nginx / CSP)",
          children: (
            <Typography.Paragraph className="!mb-0">
              On the <strong>ERPNext server</strong>, adjust nginx: remove or relax{" "}
              <Typography.Text code>X-Frame-Options SAMEORIGIN</Typography.Text> and set a
              tight <Typography.Text code>Content-Security-Policy frame-ancestors</Typography.Text>{" "}
              listing only your portal origin.
            </Typography.Paragraph>
          ),
        }]}
      />
      <DocTypeExplorer apiBase={apiBase} getAccessToken={getAccessToken} />
    </div>
  );
}
