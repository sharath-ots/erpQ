import { env } from "../config.js";
import { getFrappeClientForGatewayUser } from "../frappe/singleton.js";
import { FrappeApiError } from "@cityq/frapperestq";
import {
  resolveSupplierScope,
  filtersForDoctype,
  mergeFilters,
} from "../services/supplierScope.js";

const jwtPre = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized", detail: "Bearer JWT required" });
  }
};

function parseFilters(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

async function safeCount(client, doctype, filters) {
  const f = parseFilters(filters);
  try {
    return await client.countDocuments(doctype, f);
  } catch {
    try {
      const rows = await client.listDocuments(doctype, {
        fields: ["name"],
        limit_page_length: 500,
        filters: f,
      });
      return Array.isArray(rows) ? rows.length : null;
    } catch {
      return null;
    }
  }
}

async function safeList(client, doctype, params) {
  try {
    const rows = await client.listDocuments(doctype, params);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function getScopedClient(request) {
  const client = getFrappeClientForGatewayUser(request.user.email);
  const scope = await resolveSupplierScope(client, request.user.email);
  return { client, scope };
}

const RFQ_FIELDS = [
  "name",
  "transaction_date",
  "schedule_date",
  "status",
  "company",
  "modified",
];

/**
 * Supplier portal routes — scoped lists, dashboard, quotation & invoice submission.
 */
export async function registerSupplierQRoutes(app) {
  app.get("/api/v1/supplierq/context", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }
    const { scope } = await getScopedClient(request);
    return {
      mode: scope.mode,
      supplier: scope.supplier,
      supplierName: scope.supplierName ?? scope.supplier,
    };
  });

  app.get("/api/v1/supplierq/dashboard", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const { client, scope } = await getScopedClient(request);
    const rfqScope = mergeFilters(
      [["status", "!=", "Cancelled"]],
      filtersForDoctype("Request for Quotation", scope),
    );
    const sqScope = mergeFilters(
      [["status", "in", ["Draft", "Submitted"]]],
      filtersForDoctype("Supplier Quotation", scope),
    );
    const poScope = mergeFilters(
      [["status", "not in", ["Completed", "Cancelled", "Closed"]]],
      filtersForDoctype("Purchase Order", scope),
    );
    const piScope = mergeFilters(
      [["status", "in", ["Draft", "Unpaid", "Overdue"]]],
      filtersForDoctype("Purchase Invoice", scope),
    );

    const [
      openRfqs,
      pendingQuotations,
      openPurchaseOrders,
      pendingInvoices,
      recentRfqs,
      recentPurchaseOrders,
    ] = await Promise.all([
      safeCount(client, "Request for Quotation", rfqScope),
      safeCount(client, "Supplier Quotation", sqScope),
      safeCount(client, "Purchase Order", poScope),
      safeCount(client, "Purchase Invoice", piScope),
      safeList(client, "Request for Quotation", {
        fields: RFQ_FIELDS,
        filters: rfqScope,
        limit_page_length: 8,
        order_by: "modified desc",
      }),
      safeList(client, "Purchase Order", {
        fields: ["name", "supplier", "status", "transaction_date", "grand_total", "modified"],
        filters: poScope,
        limit_page_length: 8,
        order_by: "modified desc",
      }),
    ]);

    return {
      kpis: { openRfqs, pendingQuotations, openPurchaseOrders, pendingInvoices },
      recentRfqs,
      recentPurchaseOrders,
      scope: { mode: scope.mode, supplier: scope.supplier },
    };
  });

  app.get("/api/v1/supplierq/rfqs", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const { client, scope } = await getScopedClient(request);
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const start = Math.max(Number(request.query.offset ?? 0), 0);
    const filters = mergeFilters(
      parseFilters(request.query.filters),
      filtersForDoctype("Request for Quotation", scope),
    );

    try {
      const [data, total] = await Promise.all([
        safeList(client, "Request for Quotation", {
          fields: RFQ_FIELDS,
          filters,
          limit_start: start,
          limit_page_length: limit,
          order_by: "modified desc",
        }),
        safeCount(client, "Request for Quotation", filters),
      ]);
      return { data, total: total ?? data.length, scope: { mode: scope.mode, supplier: scope.supplier } };
    } catch (e) {
      if (e instanceof FrappeApiError) {
        return reply.code(e.status >= 500 ? 502 : e.status).send({
          error: "frappe_error",
          detail: e.message,
          frappe: e.body,
        });
      }
      throw e;
    }
  });

  app.get("/api/v1/supplierq/rfqs/:name", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }
    const name = decodeURIComponent(request.params.name);
    const { client, scope } = await getScopedClient(request);

    try {
      const doc = await client.getDocument("Request for Quotation", name);
      if (scope.mode === "supplier" && scope.supplier) {
        const invited = (doc.suppliers ?? []).some(
          (row) => row.supplier === scope.supplier,
        );
        if (!invited) {
          return reply.code(403).send({ error: "forbidden", detail: "RFQ not assigned to your supplier account" });
        }
      }
      return { data: doc, scope: { mode: scope.mode, supplier: scope.supplier } };
    } catch (e) {
      if (e instanceof FrappeApiError) {
        return reply.code(e.status >= 500 ? 502 : e.status).send({
          error: "frappe_error",
          detail: e.message,
        });
      }
      throw e;
    }
  });

  app.get("/api/v1/supplierq/documents/:doctype", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const doctype = decodeURIComponent(request.params.doctype);
    const { client, scope } = await getScopedClient(request);
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const start = Math.max(Number(request.query.offset ?? 0), 0);
    let fields;
    try {
      fields = request.query.fields ? JSON.parse(request.query.fields) : ["name", "modified"];
    } catch {
      return reply.code(400).send({ error: "bad_request", detail: "Invalid fields JSON" });
    }

    const filters = mergeFilters(
      parseFilters(request.query.filters),
      filtersForDoctype(doctype, scope),
    );

    const [data, total] = await Promise.all([
      safeList(client, doctype, {
        fields,
        filters,
        limit_start: start,
        limit_page_length: limit,
        order_by: request.query.order_by ?? "modified desc",
      }),
      safeCount(client, doctype, filters),
    ]);

    return { data, total: total ?? data.length, scope: { mode: scope.mode, supplier: scope.supplier } };
  });

  app.get("/api/v1/supplierq/purchase-orders", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }
    const { client, scope } = await getScopedClient(request);
    const filters = mergeFilters(
      [["status", "not in", ["Cancelled", "Closed"]]],
      filtersForDoctype("Purchase Order", scope),
    );
    const data = await safeList(client, "Purchase Order", {
      fields: ["name", "supplier", "status", "transaction_date", "grand_total"],
      filters,
      limit_page_length: 100,
      order_by: "modified desc",
    });
    return { data };
  });

  app.post("/api/v1/supplierq/quotations", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const body = request.body ?? {};
    const rfqName = String(body.request_for_quotation ?? "").trim();
    if (!rfqName) {
      return reply.code(400).send({ error: "request_for_quotation required" });
    }

    const { client, scope } = await getScopedClient(request);
    let supplier = scope.supplier ?? body.supplier;
    if (scope.mode === "supplier" && !supplier) {
      return reply.code(403).send({ error: "forbidden", detail: "No supplier linked to your login" });
    }
    if (scope.mode === "admin" && !supplier) {
      return reply.code(400).send({ error: "supplier required for admin submission" });
    }

    let rfq;
    try {
      rfq = await client.getDocument("Request for Quotation", rfqName);
    } catch (e) {
      return reply.code(404).send({ error: "rfq_not_found", detail: String(e) });
    }

    if (scope.mode === "supplier" && scope.supplier) {
      const invited = (rfq.suppliers ?? []).some((row) => row.supplier === scope.supplier);
      if (!invited) {
        return reply.code(403).send({ error: "forbidden", detail: "RFQ not assigned to your supplier account" });
      }
    }

    const inputItems = Array.isArray(body.items) ? body.items : [];
    const rfqItems = rfq.items ?? [];
    const sqItems = inputItems.length
      ? inputItems.map((row) => ({
          item_code: row.item_code,
          qty: Number(row.qty ?? 0),
          rate: Number(row.rate ?? 0),
          uom: row.uom ?? undefined,
          request_for_quotation: rfqName,
          request_for_quotation_item: row.rfq_item ?? row.request_for_quotation_item,
        }))
      : rfqItems.map((row) => ({
          item_code: row.item_code,
          qty: row.qty,
          rate: Number(row.rate ?? 0),
          uom: row.uom,
          request_for_quotation: rfqName,
          request_for_quotation_item: row.name,
        }));

    const doc = {
      supplier,
      company: body.company ?? rfq.company,
      request_for_quotation: rfqName,
      transaction_date: body.transaction_date ?? new Date().toISOString().slice(0, 10),
      items: sqItems,
    };

    try {
      const created = await client.createDocument("Supplier Quotation", doc);
      return reply.code(201).send({ data: created });
    } catch (e) {
      if (e instanceof FrappeApiError) {
        return reply.code(e.status >= 500 ? 502 : e.status).send({
          error: "frappe_error",
          detail: e.message,
          frappe: e.body,
        });
      }
      throw e;
    }
  });

  app.post("/api/v1/supplierq/invoices", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.erpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const body = request.body ?? {};
    const { client, scope } = await getScopedClient(request);
    let supplier = scope.supplier ?? body.supplier;
    if (scope.mode === "supplier" && !supplier) {
      return reply.code(403).send({ error: "forbidden", detail: "No supplier linked to your login" });
    }
    if (scope.mode === "admin" && !supplier) {
      return reply.code(400).send({ error: "supplier required" });
    }

    const poName = String(body.purchase_order ?? "").trim();
    let items = Array.isArray(body.items) ? body.items : [];

    if (poName && items.length === 0) {
      try {
        const po = await client.getDocument("Purchase Order", poName);
        if (scope.mode === "supplier" && po.supplier !== supplier) {
          return reply.code(403).send({ error: "forbidden", detail: "PO does not belong to your supplier account" });
        }
        supplier = po.supplier ?? supplier;
        items = (po.items ?? []).map((row) => ({
          item_code: row.item_code,
          qty: row.qty,
          rate: row.rate,
          uom: row.uom,
          purchase_order: poName,
          po_detail: row.name,
        }));
      } catch (e) {
        return reply.code(404).send({ error: "po_not_found", detail: String(e) });
      }
    }

    const doc = {
      supplier,
      company: body.company,
      bill_no: body.bill_no ?? body.supplier_invoice_no,
      posting_date: body.posting_date ?? new Date().toISOString().slice(0, 10),
      due_date: body.due_date,
      purchase_order: poName || undefined,
      items,
    };

    try {
      const created = await client.createDocument("Purchase Invoice", doc);

      const file = body.file;
      if (file?.filename && file?.content) {
        try {
          await client.callMethod("upload_file", {
            filename: file.filename,
            filedata: file.content,
            doctype: "Purchase Invoice",
            docname: created.name,
            is_private: 0,
          });
        } catch (uploadErr) {
          app.log.warn({ err: uploadErr }, "invoice file upload failed");
        }
      }

      return reply.code(201).send({ data: created });
    } catch (e) {
      if (e instanceof FrappeApiError) {
        return reply.code(e.status >= 500 ? 502 : e.status).send({
          error: "frappe_error",
          detail: e.message,
          frappe: e.body,
        });
      }
      throw e;
    }
  });
}
