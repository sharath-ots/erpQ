import { FrappeApiError } from "@cityq/frapperestq";
import { getFrappeClientForGatewayUser } from "../../frappe/singleton.js";
import {
  assertDocTypeAllowed,
  AccessDeniedError,
} from "../../auth/access.js";
import { publishEvent } from "../../services/mqPublisher.js";

function parseJsonParam(raw, label) {
  if (raw === undefined || raw === "") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON for ${label}`);
  }
}

const jwtPre = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      error: "unauthorized",
      detail: "Bearer JWT required",
    });
  }
};

/**
 * ERPNext REST surface (Frappe /api/resource + /api/method), mounted under a partner prefix.
 * Also registered at legacy `/api/v1/erp` for backward compatibility.
 */
export async function registerErpnextResourceRoutes(app) {
  app.get(
    "/meta/doctypes",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      try {
        assertDocTypeAllowed(user, "DocType");
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      const q = request.query;
      const params = {};
      try {
        if (q.filters) params.filters = parseJsonParam(q.filters, "filters");
        if (q.limit_page_length !== undefined)
          params.limit_page_length = Number(q.limit_page_length);
        if (q.order_by) params.order_by = q.order_by;
      } catch (e) {
        return reply.code(400).send({
          error: "bad_request",
          detail: e instanceof Error ? e.message : String(e),
        });
      }
      try {
        const rows = await getFrappeClientForGatewayUser(
          user.email,
        ).listDocTypes(params);
        return { data: rows };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.get(
    "/meta/doctype/:name",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const name = decodeURIComponent(request.params.name);
      try {
        assertDocTypeAllowed(user, "DocType");
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      try {
        const doc = await getFrappeClientForGatewayUser(
          user.email,
        ).getDocTypeSchema(name);
        return { data: doc };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.get(
    "/resource/:doctype/count",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      const q = request.query;
      let filters;
      try {
        if (q.filters) filters = parseJsonParam(q.filters, "filters");
      } catch (e) {
        return reply.code(400).send({
          error: "bad_request",
          detail: e instanceof Error ? e.message : String(e),
        });
      }
      try {
        const n = await getFrappeClientForGatewayUser(
          user.email,
        ).countDocuments(doctype, filters);
        return { data: n };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.get(
    "/resource/:doctype",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }

      const q = request.query;
      const params = {};
      try {
        if (q.fields) params.fields = parseJsonParam(q.fields, "fields");
        if (q.filters) params.filters = parseJsonParam(q.filters, "filters");
        if (q.or_filters)
          params.or_filters = parseJsonParam(q.or_filters, "or_filters");
        if (q.limit_start !== undefined) params.limit_start = Number(q.limit_start);
        if (q.limit_page_length !== undefined)
          params.limit_page_length = Number(q.limit_page_length);
        if (q.order_by) params.order_by = q.order_by;
      } catch (e) {
        return reply.code(400).send({
          error: "bad_request",
          detail: e instanceof Error ? e.message : String(e),
        });
      }

      try {
        const rows = await getFrappeClientForGatewayUser(
          user.email,
        ).listDocuments(doctype, params);
        return { data: rows };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.get(
    "/resource/:doctype/:name",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      const name = decodeURIComponent(request.params.name);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      try {
        const doc = await getFrappeClientForGatewayUser(
          user.email,
        ).getDocument(doctype, name);
        return { data: doc };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.post(
    "/resource/:doctype",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      try {
        const doc = await getFrappeClientForGatewayUser(
          user.email,
        ).createDocument(doctype, request.body ?? {});

        if (doctype === "Lead") {
          publishEvent({
            type: "crm.lead.created",
            payload: {
              lead: doc?.name,
              lead_name: doc?.lead_name,
              company_name: doc?.company_name,
            },
            meta: { actor: user.email ?? user.sub, via: "erpnext.resource.create" },
          }).catch(() => {});
        }

        return reply.code(201).send({ data: doc });
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.put(
    "/resource/:doctype/:name",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      const name = decodeURIComponent(request.params.name);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      try {
        const doc = await getFrappeClientForGatewayUser(
          user.email,
        ).updateDocument(doctype, name, request.body ?? {});
        return { data: doc };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.delete(
    "/resource/:doctype/:name",
    { preHandler: jwtPre },
    async (request, reply) => {
      const user = request.user;
      const doctype = decodeURIComponent(request.params.doctype);
      const name = decodeURIComponent(request.params.name);
      try {
        assertDocTypeAllowed(user, doctype);
      } catch (e) {
        if (e instanceof AccessDeniedError)
          return reply.code(403).send({ error: "forbidden", detail: e.message });
        throw e;
      }
      try {
        await getFrappeClientForGatewayUser(user.email).deleteDocument(
          doctype,
          name,
        );
        return reply.code(204).send();
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );

  app.post(
    "/method",
    { preHandler: jwtPre },
    async (request, reply) => {
      const method = request.body?.method?.trim();
      if (!method) return reply.code(400).send({ error: "method required" });
      try {
        const u = request.user;
        const result = await getFrappeClientForGatewayUser(u.email).callMethod(
          method,
          request.body?.args,
        );
        return { data: result };
      } catch (e) {
        if (e instanceof FrappeApiError)
          return reply.code(e.status >= 500 ? 502 : e.status).send({
            error: "frappe_error",
            detail: e.message,
            frappe: e.body,
          });
        throw e;
      }
    },
  );
}
