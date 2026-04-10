"use client";

import { Alert, Typography } from "antd";
import { joinDeskUrlWithQuery } from "../utils/deskUrl.js";

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
            <Typography.Text code>ERPNEXT_URL</Typography.Text> for apiGate.
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
        className="w-full flex-1 rounded border border-slate-200 bg-white"
        style={{ minHeight: "min(80vh, 900px)" }}
      />
    </div>
  );
}
