"use client";

import { Alert, Collapse, Typography } from "antd";
import { DocTypeExplorer } from "./DocTypeExplorer.jsx";

/**
 * Miscellaneous: unlisted / wildcard DocTypes only. Curated CRM uses the other sidebar entries.
 */
export function CrmOtherDocTypesPage({ apiBase, getAccessToken }) {
  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="Other doctypes"
        description={
          <>
            Use this screen only for DocTypes that are not in the main CRM menu. First-class CRM
            views (Leads, Opportunities, …) are built in-app and do not use an ERPNext iframe.
            Embedding the full Frappe desk in an iframe usually fails unless your ERPNext host
            allows it (see “Desk iframe / nginx” below).
          </>
        }
      />
      <Collapse
        items={[
          {
            key: "nginx",
            label: "Optional: allow ERPNext desk in an iframe (nginx / CSP)",
            children: (
              <Typography.Paragraph className="!mb-0">
                On the <strong>ERPNext server</strong>, adjust nginx: remove or relax{" "}
                <Typography.Text code>X-Frame-Options SAMEORIGIN</Typography.Text>, and set a
                tight{" "}
                <Typography.Text code>Content-Security-Policy frame-ancestors</Typography.Text>{" "}
                listing only your portal origin, e.g.{" "}
                <Typography.Text code>
                  add_header Content-Security-Policy &quot;frame-ancestors &apos;self&apos;
                  https://your-portal.example.com;&quot;;
                </Typography.Text>{" "}
                then reload nginx. If login inside a frame returns 403, investigate Frappe CSRF
                settings carefully (weakening CSRF has security trade-offs). This stack does{" "}
                <strong>not</strong> require a desk iframe for curated CRM — apiGate REST is enough.
              </Typography.Paragraph>
            ),
          },
        ]}
      />
      <DocTypeExplorer apiBase={apiBase} getAccessToken={getAccessToken} />
    </div>
  );
}
