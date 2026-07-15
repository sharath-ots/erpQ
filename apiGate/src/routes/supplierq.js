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

  app.post("/api/v1/supplierq/quotations/create", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });

    const { client, scope } = await getScopedClient(request);
    const body = request.body;

    const sanitize = (val) => (val && typeof val === 'string' && val.trim() !== "" ? val : null);

    const newDoc = {
      doctype: "Supplier Quotation",
      naming_series: "PUR-SQTN-.YYYY.-",
      supplier: "SUP-TES-001",
      company: "VersaQ", 
      currency: "INR",
      transaction_date: body.date,
      valid_till: body.validTill,
      quotation_number: body.quotationNumber,
      
      // Links (keep null if not linking to a specific existing document ID)
      tax_category: sanitize(body.taxCategory),
      shipping_rule: sanitize(body.shippingRule),
      incoterm: sanitize(body.incoterm),
      named_place: sanitize(body.incotermPlace),

      // ADDRESSES: Use "_display" fields for raw text addresses
      billing_address_display: body.companyAddress,
      shipping_address_display: body.shippingAddress,
      
      // TERMS: Use "terms" for raw text content
      terms: body.terms, 

      items: (body.items || []).map(item => ({
        doctype: "Supplier Quotation Item",
        item_code: item.id,
        item_name: item.name.split(' — ')[1] || item.name,
        qty: Number(item.quantity) || 0,
        rate: Number(item.price?.regular) || 0,
        uom: item.variants?.find(v => v.label === 'UOM')?.value || "Nos"
      }))
    };

    try {
      const created = await client.createDocument("Supplier Quotation", newDoc);
      return { data: created };
    } catch (e) {
      console.error("ERPNEXT FULL ERROR:", JSON.stringify(e.body, null, 2));
      return reply.code(500).send({ 
        error: "failed_to_save", 
        detail: e.body?.exc || e.message || "Check server logs" 
      });
    }
  });

  // Backend Route: Update Existing Supplier Quotation
  app.put("/api/v1/supplierq/quotations/:name", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });

    const { client } = await getScopedClient(request);
    const name = decodeURIComponent(request.params.name);
    const body = request.body;
    
    const sanitize = (val) => (val && typeof val === 'string' && val.trim() !== "" ? val : null);

    // Prepare the update object
    const updateDoc = {
      transaction_date: body.date,
      valid_till: body.validTill,
      quotation_number: body.quotationNumber,
      tax_category: sanitize(body.taxCategory),
      shipping_rule: sanitize(body.shippingRule),
      incoterm: sanitize(body.incoterm),
      named_place: sanitize(body.incotermPlace),
      billing_address_display: body.companyAddress,
      shipping_address_display: body.shippingAddress,
      terms: body.terms,
      items: (body.items || []).map(item => ({
        doctype: "Supplier Quotation Item",
        item_code: item.id,
        item_name: item.name.split(' — ')[1] || item.name,
        qty: Number(item.quantity) || 0,
        rate: Number(item.price?.regular) || 0,
        uom: item.variants?.find(v => v.label === 'UOM')?.value || "Nos"
      }))
    };

    try {
      // client.updateDocument usually takes (doctype, name, data)
      const updated = await client.updateDocument("Supplier Quotation", name, updateDoc);
      return { data: updated };
    } catch (e) {
      console.error("ERPNEXT UPDATE ERROR:", JSON.stringify(e.body, null, 2));
      return reply.code(500).send({ 
        error: "failed_to_update", 
        detail: e.body?.exc_type || e.message 
      });
    }
  });

  // Add to registerSupplierQRoutes in supplierq.js
  app.get("/api/v1/supplierq/options/:doctype", { preHandler: jwtPre }, async (request, reply) => {
      if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });
      const doctype = decodeURIComponent(request.params.doctype);
      const { client } = await getScopedClient(request);
      
      // Fetch names of the doctype (e.g., list of all Tax Categories)
      const rows = await safeList(client, doctype, { fields: ["name"], limit_page_length: 500 });
      return { data: rows.map(r => r.name) };
  });

  // Backend Route: Fetch Full Item Details
  app.get("/api/v1/supplierq/items/:itemCode/details", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });
    
    const itemCode = decodeURIComponent(request.params.itemCode);
    const { client } = await getScopedClient(request); // Scoped client to ensure supplier access

    try {
      // Fetches the entire Item document
      const doc = await client.getDocument("Item", itemCode);
      return { data: doc };
    } catch (e) {
      request.log.error("Failed to fetch item details:", e);
      return reply.code(404).send({ error: "item_not_found" });
    }
  });

  // Backend Route: Resolve ERPNext Link Fields (Hashes) to Human-Readable Titles
  app.get("/api/v1/supplierq/resolve-link", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });
    
    const { doctype, name } = request.query;
    if (!doctype || !name) return reply.code(400).send({ error: "missing_params" });
    
    const hostOrigin = new URL(env.versaqErpnextUrl).origin;

    try {
      // Securely fetch the full linked document from ERPNext
      const res = await fetch(`${hostOrigin}/api/method/frappe.client.get?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {
          "Authorization": `token ${env.versaqErpnextApiKey}:${env.versaqErpnextApiSecret}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!res.ok) throw new Error("Document not found");
      
      const data = await res.json();
      const doc = data?.message || {};
      
      // Look for standard human-readable fields; fallback to hash if none exist
      const readableTitle = doc.title || doc.variant || doc.variant_name || doc.system_name || doc.sub_system_name || doc.type_name || doc.description || doc.type_of_item || doc.item_type || doc.name || name;
      
      return { title: readableTitle };
    } catch (e) {
      request.log.error("Failed to resolve link title:", e);
      return { title: name }; // Fallback to hash if fetch fails
    }
  });

  // 1. Backend Route: Fetch Item Image Path
  app.get("/api/v1/supplierq/items/:itemCode/image", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });
    
    const itemCode = decodeURIComponent(request.params.itemCode);
    const hostOrigin = new URL(env.versaqErpnextUrl).origin;

    try {
      const res = await fetch(`${hostOrigin}/api/method/frappe.client.get_value?doctype=Item&filters={"name":"${itemCode}"}&fieldname=image`, {
        method: "POST",
        headers: {
          "Authorization": `token ${env.versaqErpnextApiKey}:${env.versaqErpnextApiSecret}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      return { image: data?.message?.image || null };
    } catch (e) {
      request.log.error("Failed to fetch image path:", e);
      return { image: null };
    }
  });

  // 2. Backend Route: Proxy Private Image Blob
  app.get("/api/v1/supplierq/private-image", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });
    
    const imagePath = request.query.path;
    if (!imagePath) return reply.code(400).send({ error: "path_required" });

    const hostOrigin = new URL(env.versaqErpnextUrl).origin;
    const fullUrl = `${hostOrigin}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;

    try {
      // Securely fetch the actual image file using your backend API keys
      const res = await fetch(fullUrl, {
        headers: {
          "Authorization": `token ${env.versaqErpnextApiKey}:${env.versaqErpnextApiSecret}`
        }
      });

      if (!res.ok) {
        return reply.code(res.status).send({ error: "failed_to_fetch_image" });
      }

      // Read the image as a buffer and send it directly to the frontend
      const buffer = await res.arrayBuffer();
      reply.header('Content-Type', res.headers.get('content-type') || 'image/png');
      return reply.send(Buffer.from(buffer));
    } catch (e) {
      request.log.error("Failed to proxy private image:", e);
      return reply.code(500).send({ error: "proxy_failed" });
    }
  });

  app.get("/api/v1/supplierq/context", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
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
    if (!env.versaqErpnextUrl) {
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
    if (!env.versaqErpnextUrl) {
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
    if (!env.versaqErpnextUrl) {
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

      // --- NEW FIX: Fetch default Item Prices & Item Names from ERPNext ---
      if (doc.items && doc.items.length > 0) {
        try {
          const itemCodes = doc.items.map(item => item.item_code);
          
          // 1. Fetch Prices
          const prices = await safeList(client, "Item Price", {
            fields: ["item_code", "price_list_rate"],
            filters: [["item_code", "in", itemCodes]],
            limit_page_length: 500, 
          });

          const priceMap = {};
          prices.forEach(p => {
            if (!priceMap[p.item_code]) {
              priceMap[p.item_code] = p.price_list_rate;
            }
          });

          // 2. Fetch Item Names from Item Master
          const itemMaster = await safeList(client, "Item", {
            fields: ["item_code", "item_name"],
            filters: [["item_code", "in", itemCodes]],
            limit_page_length: 500,
          });

          const nameMap = {};
          itemMaster.forEach(i => {
            nameMap[i.item_code] = i.item_name;
          });

          // Attach default_item_price and fallback item_name to each item
          doc.items = doc.items.map(item => ({
            ...item,
            default_item_price: priceMap[item.item_code] || 0,
            // Uses the existing item_name if it exists, otherwise falls back to the Item Master name
            item_name: item.item_name || nameMap[item.item_code] || ""
          }));
        } catch (err) {
          console.error("Failed to fetch Item Prices or Names:", err);
        }
      }
      // -------------------------------------------------------

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

  // 1. GET: List Supplier Quotations
  app.get("/api/v1/supplierq/quotations", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });

    const { client, scope } = await getScopedClient(request);
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const start = Math.max(Number(request.query.offset ?? 0), 0);
    
    // Apply supplier filtering scope (only show their own quotes)
    const filters = filtersForDoctype("Supplier Quotation", scope);

    try {
      const [data, total] = await Promise.all([
        safeList(client, "Supplier Quotation", {
          fields: ["name", "supplier", "status", "transaction_date", "grand_total", "modified"],
          filters,
          limit_start: start,
          limit_page_length: limit,
          order_by: "modified desc",
        }),
        safeCount(client, "Supplier Quotation", filters),
      ]);
      return { data, total: total ?? data.length };
    } catch (e) {
      throw e;
    }
  });

  // GET: Fetch a single Supplier Quotation by ID
  app.get("/api/v1/supplierq/quotations/:id", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });

    const { client, scope } = await getScopedClient(request);
    const docName = decodeURIComponent(request.params.id);

    try {
      // Fetch the full document from ERPNext
      const doc = await client.getDocument("Supplier Quotation", docName);
      
      // Security check: ensure the supplier can only see their own quotations
      if (scope.mode === "supplier" && scope.supplier && doc.supplier !== scope.supplier) {
        return reply.code(403).send({ error: "forbidden", detail: "Access denied to this quotation" });
      }
      
      return { data: doc };
    } catch (e) {
      return reply.code(404).send({ error: "not_found", detail: "Quotation not found" });
    }
  });

  app.get("/api/v1/supplierq/documents/:doctype", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
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
    if (!env.versaqErpnextUrl) {
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

  // GET: Fetch a single Purchase Order by ID
  app.get("/api/v1/supplierq/purchase-orders/:id", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) return reply.code(503).send({ error: "erp_not_configured" });

    const { client, scope } = await getScopedClient(request);
    const docName = decodeURIComponent(request.params.id);

    try {
      // Fetch the full document from ERPNext
      const doc = await client.getDocument("Purchase Order", docName);
      
      // Security check: ensure the supplier can only see their own POs
      if (scope.mode === "supplier" && scope.supplier && doc.supplier !== scope.supplier) {
        return reply.code(403).send({ error: "forbidden", detail: "Access denied to this Purchase Order" });
      }
      
      return { data: doc };
    } catch (e) {
      return reply.code(404).send({ error: "not_found", detail: "Purchase Order not found" });
    }
  });

  app.post("/api/v1/supplierq/quotations", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
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

  app.get("/api/v1/supplierq/purchase-invoices", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }

    const { client, scope } = await getScopedClient(request);
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const start = Math.max(Number(request.query.offset ?? 0), 0);
    const filters = mergeFilters(
      parseFilters(request.query.filters),
      filtersForDoctype("Purchase Invoice", scope),
    );

    try {
      const [data, total] = await Promise.all([
        safeList(client, "Purchase Invoice", {
          // FIX 1: Use specific Purchase Invoice fields instead of RFQ_FIELDS
          fields: ["name", "supplier", "posting_date", "due_date", "grand_total", "outstanding_amount", "status"],
          filters,
          limit_start: start,
          limit_page_length: limit,
          order_by: "modified desc",
        }),
        safeCount(client, "Purchase Invoice", filters),
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

  app.get("/api/v1/supplierq/purchase-invoices/:name", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
      return reply.code(503).send({ error: "erp_not_configured" });
    }
    const name = decodeURIComponent(request.params.name);
    const { client, scope } = await getScopedClient(request);

    try {
      const doc = await client.getDocument("Purchase Invoice", name);
      
      if (scope.mode === "supplier" && scope.supplier) {
        // FIX 2: Purchase Invoices only have a single 'supplier' field, not an array
        if (doc.supplier !== scope.supplier) {
          return reply.code(403).send({ 
            error: "forbidden", 
            detail: "Purchase Invoice not assigned to your supplier account" 
          });
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

  app.post("/api/v1/supplierq/invoices", { preHandler: jwtPre }, async (request, reply) => {
    if (!env.versaqErpnextUrl) {
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