/**
 * Browser/Node client for ERPNext REST **through apiGate** only.
 * @see ../index.js for package entry
 */

export class GatewayErpNextError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "GatewayErpNextError";
    this.status = status;
    this.body = body;
  }
}

function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    q.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  return q.toString();
}

export class ErpNextGatewayClient {
  constructor(opts) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.prefix = (opts.apiPrefix ?? "/api/v1/partners/erpnext").replace(
      /\/$/,
      "",
    );
    this.getAccessToken = opts.getAccessToken;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  url(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${this.prefix}${p}`;
  }

  async request(path, init = {}) {
    const token = await this.getAccessToken?.();
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await this.fetchImpl(this.url(path), {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    });
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      const msg =
        body?.detail ??
        body?.error ??
        (typeof body?.message === "string" ? body.message : res.statusText);
      throw new GatewayErpNextError(res.status, String(msg), body);
    }
    return body;
  }

  listDocTypes(query = {}) {
    const qs = buildQuery(query);
    return this.request(`/meta/doctypes${qs ? `?${qs}` : ""}`);
  }

  getDocTypeMeta(name) {
    return this.request(`/meta/doctype/${encodeURIComponent(name)}`);
  }

  listDocuments(doctype, params = {}) {
    const qs = buildQuery(params);
    const enc = encodeURIComponent(doctype);
    return this.request(`/resource/${enc}${qs ? `?${qs}` : ""}`);
  }

  getDocument(doctype, name) {
    return this.request(
      `/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    );
  }

  createDocument(doctype, data) {
    return this.request(`/resource/${encodeURIComponent(doctype)}`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    });
  }

  updateDocument(doctype, name, data) {
    return this.request(
      `/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        body: JSON.stringify(data ?? {}),
      },
    );
  }

  async deleteDocument(doctype, name) {
    await this.request(
      `/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  }

  countDocuments(doctype, filters) {
    const params = {};
    if (filters !== undefined) {
      params.filters =
        typeof filters === "string" ? filters : JSON.stringify(filters);
    }
    const qs = buildQuery(params);
    return this.request(
      `/resource/${encodeURIComponent(doctype)}/count${qs ? `?${qs}` : ""}`,
    );
  }

  callMethod(methodPath, args) {
    return this.request("/method", {
      method: "POST",
      body: JSON.stringify({ method: methodPath, args }),
    });
  }
}
