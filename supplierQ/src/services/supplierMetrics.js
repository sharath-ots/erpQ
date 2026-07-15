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

// Add to supplierMetrics.js
export async function submitSupplierQuotation(payload, opts = {}) {
  return supplierFetch("/api/v1/supplierq/quotations/create", {
    ...opts,
    method: "POST",
    body: payload
  });
}

export async function updateSupplierQuotation(name, payload, opts = {}) {
  return supplierFetch(`/api/v1/supplierq/quotations/${encodeURIComponent(name)}`, {
    ...opts,
    method: "PUT",
    body: payload
  });
}

export async function fetchOptions(doctype, opts = {}) {
  try {
    const res = await supplierFetch(`/api/v1/supplierq/options/${encodeURIComponent(doctype)}`, {
      ...opts,
      method: "GET"
    });
    return res.data || [];
  } catch (error) {
    console.error(`Error fetching options for ${doctype}:`, error);
    return [];
  }
}

// Fetches the full item details document from the backend
export async function fetchItemDetails(itemCode, opts = {}) {
  try {
    const res = await supplierFetch(`/api/v1/supplierq/items/${encodeURIComponent(itemCode)}/details`, {
      ...opts,
      method: "GET"
    });
    return res.data || null;
  } catch (error) {
    console.error("Error fetching item details:", error);
    return null;
  }
}

// Resolves database hashes into readable titles from the backend proxy
export async function fetchLinkedTitle(doctype, docname, opts = {}) {
  if (!docname) return null;
  try {
    const res = await supplierFetch(`/api/v1/supplierq/resolve-link?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(docname)}`, {
      ...opts,
      method: "GET"
    });
    return res.title || docname;
  } catch (error) {
    console.error(`Error fetching linked title for ${doctype}:`, error);
    return docname; // Fallback to hash to prevent UI breaking
  }
}

// Fetches the path string (e.g. "/private/files/Chassis.png") from your new backend route
export async function fetchItemImage(itemCode, opts) {
  try {
    const res = await supplierFetch(`/api/v1/supplierq/items/${encodeURIComponent(itemCode)}/image`, {
      ...opts,
      method: "GET"
    });
    return res.image || null;
  } catch (error) {
    console.error("Error fetching item image path:", error);
    return null;
  }
}

// Fetches the actual image file through your backend proxy and creates a local browser URL
export async function fetchPrivateImageBlob(imagePath, { apiBase, getAccessToken }) {
  try {
    const base = (apiBase ?? "").replace(/\/$/, "");
    const token = await getAccessToken?.();

    const res = await fetch(`${base}/api/v1/supplierq/private-image?path=${encodeURIComponent(imagePath)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob); // Creates a local image URL for the <Image /> component
    }
    return null;
  } catch (error) {
    console.error("Error fetching private image blob:", error);
    return null;
  }
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

export async function fetchSupplierQuotations({ limit = 20, offset = 0, ...opts }) {

  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  return supplierFetch(`/api/v1/supplierq/quotations?${qs}`, opts);
}

export async function fetchSupplierQuotationDetail(name, opts) {

  return supplierFetch(`/api/v1/supplierq/quotations/${encodeURIComponent(name)}`, opts);

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

export async function fetchSupplierPurchaseOrdersDetail(name, opts) {

  return supplierFetch(`/api/v1/supplierq/purchase-orders/${encodeURIComponent(name)}`, opts);

}


// export async function submitSupplierQuotation(body, opts) {

//   return supplierFetch("/api/v1/supplierq/quotations", { ...opts, method: "POST", body });

// }

export async function fetchPurchaseInvoices(opts) {

  return supplierFetch("/api/v1/supplierq/purchase-invoices", opts);

}

export async function fetchPurchaseInvoiceDetail(name, opts) {

  return supplierFetch(`/api/v1/supplierq/purchase-invoices/${encodeURIComponent(name)}`, opts);

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


