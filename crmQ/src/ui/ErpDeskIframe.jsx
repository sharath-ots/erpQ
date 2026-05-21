"use client";

import { Alert, Typography } from "antd";
import { joinDeskUrlWithQuery } from "../utils/deskUrl.js";

/**
 * Embeds the ERPNext desk in an iframe. The ERPNext host must allow framing
 * (no X-Frame-Options: DENY / restrictive CSP frame-ancestors) for this to work.
 *
 * Optional `deskIframeQuery` (from apiGate ERPNEXT_IFRAME_QUERY) is appended so Frappe
 * can read params into frappe.route_options. Hiding the workspace sidebar usually also
 * requires ERPNext-side CSS or role settings — see apiGate env docs.
 */
export function ErpDeskIframe({ deskBaseUrl, path, deskIframeQuery }) {
  const src = deskBaseUrl?.trim()
    ? joinDeskUrlWithQuery(deskBaseUrl, path, deskIframeQuery)
    : "";

  if (!src) {
    return (
      <Alert
        type="warning"
        showIcon
        message="ERPNext desk URL not configured"
        description={
          <>
            Set <Typography.Text code>ERPNEXT_PUBLIC_URL</Typography.Text> or{" "}
            <Typography.Text code>ERPNEXT_URL</Typography.Text> for apiGate so the portal
            can build the iframe <Typography.Text code>src</Typography.Text>. If the frame
            stays blank, check the ERPNext site allows embedding (frame-ancestors / CSP).
          </>
        }
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-2">
      <iframe
        title="ERPNext desk"
        src={src}
        className="w-full flex-1 rounded border border-slate-200 bg-white dark:bg-gray-900"
        style={{ minHeight: "min(80vh, 900px)" }}
      />
    </div>
  );
}
