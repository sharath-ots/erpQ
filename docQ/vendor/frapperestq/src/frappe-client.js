function joinUrl(base, path) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function toQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    q.set(k, String(v));
  }
  return q;
}

/**
 * Server-side Frappe / ERPNext REST client.
 * @see https://frappeframework.com/docs/user/en/api/rest
 */
export class FrappeClient {
  constructor(opts) {
    this.base = opts.baseUrl.replace(/\/$/, "");
    this.prefix = opts.apiPrefix ?? "";
    this.auth = opts.auth;
    this.fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  resourcePath(doctype, name) {
    const enc = encodeURIComponent(doctype);
    if (name === undefined) return `${this.prefix}/api/resource/${enc}`;
    return `${this.prefix}/api/resource/${enc}/${encodeURIComponent(name)}`;
  }

  async request(path, init = {}) {
    let url = joinUrl(this.base, path);
    if (init.query) {
      const q = toQuery(init.query);
      url += (url.includes("?") ? "&" : "?") + q.toString();
    }
    const { query: _q, headers: initHeaders, ...rest } = init;
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (initHeaders && typeof initHeaders === "object" && !Array.isArray(initHeaders)) {
      if (initHeaders instanceof Headers) {
        initHeaders.forEach((v, k) => {
          headers[k] = v;
        });
      } else {
        Object.assign(headers, initHeaders);
      }
    }
    if (this.auth.kind === "token") {
      headers.Authorization = `token ${this.auth.apiKey}:${this.auth.apiSecret}`;
    } else {
      headers.Cookie = this.auth.cookieHeader;
    }

    const res = await this.fetchFn(url, {
      ...rest,
      headers,
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Frappe non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      const err = body;
      const msg =
        err?.exception ??
        err?.exc_type ??
        (typeof body === "object" && body && "_server_messages" in err
          ? String(err._server_messages)
          : JSON.stringify(body));
      throw new FrappeApiError(res.status, msg, body);
    }
    return body;
  }

  /** List documents with filters / fields (GET /api/resource/{DocType}) */
  async listDocuments(doctype, params = {}) {
    const q = {};
    if (params.fields?.length)
      q.fields = JSON.stringify(params.fields);
    if (params.filters !== undefined)
      q.filters =
        typeof params.filters === "string"
          ? params.filters
          : JSON.stringify(params.filters);
    if (params.or_filters !== undefined)
      q.or_filters =
        typeof params.or_filters === "string"
          ? params.or_filters
          : JSON.stringify(params.or_filters);
    if (params.limit_start !== undefined) q.limit_start = params.limit_start;
    if (params.limit_page_length !== undefined)
      q.limit_page_length = params.limit_page_length;
    if (params.order_by) q.order_by = params.order_by;
    if (params.as_dict !== undefined) q.as_dict = params.as_dict ? 1 : 0;

    const res = await this.request(this.resourcePath(doctype), {
      method: "GET",
      query: q,
    });
    return res.data ?? [];
  }

  /** Single document (GET /api/resource/{DocType}/{name}) */
  async getDocument(doctype, name) {
    const res = await this.request(
      this.resourcePath(doctype, name),
      { method: "GET" },
    );
    return res.data;
  }

  /** Create (POST /api/resource/{DocType}) */
  async createDocument(doctype, data) {
    const res = await this.request(this.resourcePath(doctype), {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  }

  /** Update (PUT /api/resource/{DocType}/{name}) */
  async updateDocument(doctype, name, data) {
    const res = await this.request(
      this.resourcePath(doctype, name),
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    return res.data;
  }

  /** Delete (DELETE /api/resource/{DocType}/{name}) */
  async deleteDocument(doctype, name) {
    await this.request(this.resourcePath(doctype, name), { method: "DELETE" });
  }

  /** Whitelisted server method (POST /api/method/{dotted.path}) */
  async callMethod(methodPath, args) {
    const path = `${this.prefix}/api/method/${methodPath.replace(/^\//, "")}`;
    const res = await this.request(path, {
      method: "POST",
      body: args ? JSON.stringify(args) : "{}",
    });
    return res.message ?? res;
  }

  /**
   * List DocType definitions (rows of the DocType DocType).
   * @param {object} [params] — passed to listDocuments (filters, limit_page_length, etc.)
   */
  async listDocTypes(params = {}) {
    const merged = {
      fields: ["name", "module", "issingle", "istable", "custom"],
      limit_page_length: 500,
      order_by: "name asc",
      ...params,
    };
    return this.listDocuments("DocType", merged);
  }

  /**
   * Full DocType row (schema metadata as stored on DocType).
   * @see https://frappeframework.com/docs/user/en/api/rest
   */
  async getDocTypeSchema(doctypeName) {
    return this.getDocument("DocType", doctypeName);
  }

  /**
   * Document count (uses whitelisted `frappe.desk.reportview.get_count`).
   * Requires that method to be allowed for the integration user in ERPNext.
   */
  async countDocuments(doctype, filters) {
    const payload = { doctype };
    if (filters !== undefined)
      payload.filters = filters;
    const raw = await this.callMethod(
      "frappe.desk.reportview.get_count",
      payload,
    );
    if (typeof raw === "number") return raw;
    if (raw && typeof raw === "object" && "message" in raw)
      return Number(raw.message);
    return Number(raw);
  }
}

export class FrappeApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "FrappeApiError";
    this.status = status;
    this.body = body;
  }
}
