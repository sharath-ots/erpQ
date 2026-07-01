/**
 * Supplier portal API client helpers (via apiGate).
 */

async function supplierFetch(path, { apiBase, getAccessToken, method = "GET", body } = {}) {
  const base = (apiBase ?? "").replace(/\/$/, "");
  const token = await getAccessToken?.();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail ?? json?.error ?? `Request failed (${res.status})`);
  }
  return json;
}

export async function fetchSupplierMetrics(opts) {
  return supplierFetch("/api/v1/supplierq/dashboard", opts);
}

export async function fetchSupplierContext(opts) {
  return supplierFetch("/api/v1/supplierq/context", opts);
}

export async function fetchSupplierRfqs({ limit = 20, offset = 0, ...opts }) {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return supplierFetch(`/api/v1/supplierq/rfqs?${qs}`, opts);
}

export async function fetchSupplierRfqDetail(name, opts) {
  return supplierFetch(`/api/v1/supplierq/rfqs/${encodeURIComponent(name)}`, opts);
}

export async function fetchSupplierDocuments(doctype, { fields, limit = 20, offset = 0, ...opts }) {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (fields?.length) qs.set("fields", JSON.stringify(fields));
  return supplierFetch(
    `/api/v1/supplierq/documents/${encodeURIComponent(doctype)}?${qs}`,
    opts,
  );
}

export async function fetchSupplierPurchaseOrders(opts) {
  return supplierFetch("/api/v1/supplierq/purchase-orders", opts);
}

export async function submitSupplierQuotation(body, opts) {
  return supplierFetch("/api/v1/supplierq/quotations", { ...opts, method: "POST", body });
}

export async function submitSupplierInvoice(body, opts) {
  return supplierFetch("/api/v1/supplierq/invoices", { ...opts, method: "POST", body });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function submitSupplierInvoiceWithFile(form, file, opts) {
  let filePayload;
  if (file) {
    filePayload = {
      filename: file.name,
      content: await readFileAsBase64(file),
    };
  }
  return submitSupplierInvoice({ ...form, file: filePayload }, opts);
}
