"use client";

import { Alert, Typography } from "antd";
import { SupplierHome } from "./SupplierHome.jsx";
import { SupplierEntityList } from "./SupplierEntityList.jsx";
import { RfqListPage } from "./RfqListPage.jsx";
import { QuotationFormPage } from "./QuotationFormPage.jsx";
import { InvoiceUploadPage } from "./InvoiceUploadPage.jsx";
import { SupplierOtherDocTypesPage } from "./SupplierOtherDocTypesPage.jsx";
import { PurchaseOrderView } from "./PurchaseOrder.jsx";
import { SupplierQuotationView } from "./SupplierQuotationView.jsx";
import { PurchaseInvoiceView } from "./PurchaseInvoiceView.jsx";
import { ErpDeskIframe } from "./ErpDeskIframe.jsx";
import { supplierCuratedDocTypeSet, getSupplierListViewConfig } from "../constants/supplierListViews.js";

export function SupplierqShell({
  pathname,
  deskBaseUrl,
  deskIframeQuery,
  apiBase,
  getAccessToken,
}) {
  const normalized = pathname.replace(/\/$/, "") || "/m/supplierq";

  if (normalized.startsWith("/m/supplierq/iframe")) {
    const tail = normalized.slice("/m/supplierq/iframe".length);
    const deskPath = (tail && tail.startsWith("/") ? tail : `/${tail || "app"}`).replace(/\/+$/, "");
    return (
      <ErpDeskIframe
        deskBaseUrl={deskBaseUrl}
        path={deskPath || "/app"}
        deskIframeQuery={deskIframeQuery}
      />
    );
  }

  if (normalized === "/m/supplierq") {
    return <SupplierHome apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/rfqs") {
    return <RfqListPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/quotation/new") {
    return <QuotationFormPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/invoice/upload") {
    return <InvoiceUploadPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/other") {
    return <SupplierOtherDocTypesPage apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/list/supplier-quotation") {
    return <SupplierQuotationView apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/list/purchase-order") {
    return <PurchaseOrderView apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  if (normalized === "/m/supplierq/list/purchase-invoice") {
    return <PurchaseInvoiceView apiBase={apiBase} getAccessToken={getAccessToken} />;
  }

  const listMatch = normalized.match(/^\/m\/supplierq\/list\/([^/]+)$/);
  if (listMatch) {
    const doctype = decodeURIComponent(listMatch[1]);
    const allowed = supplierCuratedDocTypeSet();
    if (!allowed.has(doctype)) {
      return (
        <Alert
          type="warning"
          showIcon
          message="Not a curated list"
          description={
            <>
              <Typography.Text code>{doctype}</Typography.Text> is not in the Supplier Portal menu.
            </>
          }
        />
      );
    }
    const cfg = getSupplierListViewConfig(doctype);
    return (
      <SupplierEntityList
        doctype={doctype}
        apiBase={apiBase}
        getAccessToken={getAccessToken}
        title={cfg?.label}
        listFields={cfg?.listFields}
      />
    );
  }

  return <Alert type="info" message="Unknown Supplier Portal path" description={pathname} />;
}
