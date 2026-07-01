const ADMIN_ROLES = new Set([
  "Administrator",
  "System Manager",
  "Purchase Manager",
  "Purchase User",
  "Purchase Master Manager",
]);

/**
 * Resolve supplier portal scope for the logged-in user.
 * Admins (ERPNext roles above) see all data; suppliers see only their records.
 * @returns {Promise<{ mode: "admin" | "supplier", supplier: string | null, supplierName?: string }>}
 */
export async function resolveSupplierScope(client, email) {
  const em = String(email ?? "").trim();
  if (!em) return { mode: "supplier", supplier: null };

  try {
    const users = await client.listDocuments("User", {
      filters: [["email", "=", em]],
      fields: ["name"],
      limit_page_length: 1,
    });
    const userName = users[0]?.name;
    if (userName) {
      const userDoc = await client.getDocument("User", userName);
      const roleNames = (userDoc.roles ?? []).map((r) => r.role).filter(Boolean);
      if (roleNames.some((r) => ADMIN_ROLES.has(r))) {
        return { mode: "admin", supplier: null };
      }
    }
  } catch {
    // fall through to supplier lookup
  }

  try {
    const suppliers = await client.listDocuments("Supplier", {
      filters: [["email_id", "=", em]],
      fields: ["name", "supplier_name"],
      limit_page_length: 1,
    });
    if (suppliers[0]?.name) {
      return {
        mode: "supplier",
        supplier: suppliers[0].name,
        supplierName: suppliers[0].supplier_name ?? suppliers[0].name,
      };
    }
  } catch {
    // continue
  }

  try {
    const contacts = await client.listDocuments("Contact", {
      filters: [["email_id", "=", em]],
      fields: ["name"],
      limit_page_length: 1,
    });
    if (contacts[0]?.name) {
      const links = await client.listDocuments("Dynamic Link", {
        filters: [
          ["parent", "=", contacts[0].name],
          ["link_doctype", "=", "Supplier"],
        ],
        fields: ["link_name"],
        limit_page_length: 1,
      });
      if (links[0]?.link_name) {
        return { mode: "supplier", supplier: links[0].link_name };
      }
    }
  } catch {
    // no mapping
  }

  return { mode: "supplier", supplier: null };
}

/** Build Frappe list filters for a doctype given supplier scope. */
export function filtersForDoctype(doctype, scope) {
  if (scope.mode === "admin" || !scope.supplier) return [];

  switch (doctype) {
    case "Request for Quotation":
      return [["Request for Quotation Supplier", "supplier", "=", scope.supplier]];
    case "Supplier Quotation":
    case "Purchase Order":
    case "Purchase Invoice":
      return [["supplier", "=", scope.supplier]];
    default:
      return [];
  }
}

export function mergeFilters(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    const arr = Array.isArray(p) ? p : [];
    for (const row of arr) {
      if (Array.isArray(row) && row.length) out.push(row);
    }
  }
  return out;
}
