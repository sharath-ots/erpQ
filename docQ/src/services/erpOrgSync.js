import { normalizeEmail } from "../lib/auth.js";
import { erpClient } from "./erpClient.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Sync org row for one user from ERPNext Employee + User.
 * @param {import("pg").Pool} pool
 * @param {string} email
 */
export async function syncOrgUser(pool, email) {
  const em = normalizeEmail(email);
  if (!em) return null;

  const client = await erpClient();
  if (!client) {
    return loadCached(pool, em);
  }

  try {
    let department = null;
    let designation = null;
    let reportsToEmail = null;
    let employeeId = null;
    let employeeName = null;
    let roleProfileName = null;
    let roles = [];

    const employees = await client.listDocuments("Employee", {
      filters: [["company_email", "=", em]],
      fields: ["name", "employee_name", "department", "designation", "reports_to"],
      limit_page_length: 1,
    });

    let emp = employees[0];
    if (!emp) {
      const employeesAlt = await client.listDocuments("Employee", {
        filters: [["user_id", "=", em]],
        fields: ["name", "employee_name", "department", "designation", "reports_to"],
        limit_page_length: 1,
      });
      emp = employeesAlt[0];
    }

    if (emp) {
      employeeId = emp.name;
      employeeName = emp.employee_name || emp.name;
      department = emp.department || null;
      designation = emp.designation || null;
      if (emp.reports_to) {
        try {
          const mgr = await client.getDocument("Employee", emp.reports_to);
          reportsToEmail =
            mgr?.company_email || mgr?.prefered_email || mgr?.user_id || null;
        } catch {
          reportsToEmail = null;
        }
      }
    }

    try {
      const users = await client.listDocuments("User", {
        filters: [["email", "=", em]],
        fields: ["name", "email", "role_profile_name"],
        limit_page_length: 1,
      });
      const userDoc = users[0];
      if (userDoc) {
        roleProfileName = userDoc.role_profile_name || null;
        const full = await client.getDocument("User", userDoc.name);
        roles = (full?.roles ?? []).map((r) => r.role).filter(Boolean);
      }
    } catch {
      // User doc optional
    }

    await pool.query(
      `
        insert into org_cache(
          email, employee_id, employee_name, department, designation,
          reports_to_email, roles, role_profile_name, synced_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8, now())
        on conflict (email) do update set
          employee_id = excluded.employee_id,
          employee_name = excluded.employee_name,
          department = excluded.department,
          designation = excluded.designation,
          reports_to_email = excluded.reports_to_email,
          roles = excluded.roles,
          role_profile_name = excluded.role_profile_name,
          synced_at = now()
      `,
      [
        em,
        employeeId,
        employeeName,
        department,
        designation,
        reportsToEmail,
        JSON.stringify(roles),
        roleProfileName,
      ],
    );

    return loadCached(pool, em);
  } catch {
    return loadCached(pool, em);
  }
}

async function loadCached(pool, email) {
  const { rows } = await pool.query("select * from org_cache where email = $1", [
    email,
  ]);
  return rows[0] || null;
}

export async function getOrgUser(pool, email) {
  const em = normalizeEmail(email);
  const { rows } = await pool.query("select * from org_cache where email = $1", [em]);
  const row = rows[0];
  if (!row) return syncOrgUser(pool, em);
  const age = Date.now() - new Date(row.synced_at).getTime();
  if (age > CACHE_TTL_MS) return syncOrgUser(pool, em);
  return row;
}

/**
 * Resolve approver email for a workflow step definition.
 * @param {object} step - { type: 'user'|'role'|'reports_to', value?, departmentFromDoc? }
 * @param {object} doc - document row
 * @param {object|null} org - org_cache row for author
 */
export async function resolveStepAssignee(pool, step, doc, org) {
  const type = String(step?.type || "").toLowerCase();
  if (type === "user" && step.value) {
    return normalizeEmail(step.value);
  }
  if (type === "reports_to" && org?.reports_to_email) {
    return normalizeEmail(org.reports_to_email);
  }
  if (type === "role" && step.value) {
    const dept =
      step.departmentFromDoc && doc.department ? doc.department : null;
    const client = await erpClient();
    if (client && dept) {
      try {
        const emps = await client.listDocuments("Employee", {
          filters: [
            ["department", "=", dept],
            ["designation", "like", `%${step.value}%`],
          ],
          fields: ["company_email", "user_id", "employee_name"],
          limit_page_length: 1,
        });
        const hit = emps[0];
        if (hit?.company_email) return normalizeEmail(hit.company_email);
        if (hit?.user_id) return normalizeEmail(hit.user_id);
      } catch {
        // fall through
      }
    }
    if (org?.roles && Array.isArray(org.roles)) {
      const roleNames = org.roles.map(String);
      if (roleNames.some((r) => r.includes(step.value))) {
        return normalizeEmail(org.reports_to_email || doc.author_email);
      }
    }
  }
  return null;
}

export async function listErpUsers(pool, { q = "", limit = 100, domain = "" } = {}) {
  const client = await erpClient();
  const needle = String(q || "").trim().toLowerCase();
  const domainNorm = String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (!client) {
    const params = [];
    let sql = "select email, employee_name as name from org_cache where email is not null";
    if (domainNorm) {
      params.push(`%@${domainNorm}`);
      sql += ` and email ilike $${params.length}`;
    }
    if (needle) {
      params.push(`%${needle}%`);
      sql += ` and (email ilike $${params.length} or coalesce(employee_name,'') ilike $${params.length})`;
    }
    params.push(limit);
    sql += ` order by email asc limit $${params.length}`;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({ email: r.email, name: r.name || r.email }));
  }

  try {
    /** @type {unknown[][]} */
    const filters = [["enabled", "=", 1]];
    if (domainNorm) {
      filters.push(["email", "like", `%@${domainNorm}`]);
    }
    if (needle) {
      filters.push(["email", "like", `%${needle}%`]);
    }
    const users = await client.listDocuments("User", {
      filters,
      fields: ["email", "full_name", "name"],
      limit_page_length: limit,
      order_by: "email asc",
    });
    return users
      .map((u) => ({
        email: normalizeEmail(u.email),
        name: u.full_name || u.name || u.email,
      }))
      .filter((u) => u.email);
  } catch {
    // Fall back to cache if ERPNext listing fails (auth, network, permissions).
    const params = [];
    let sql = "select email, employee_name as name from org_cache where email is not null";
    if (domainNorm) {
      params.push(`%@${domainNorm}`);
      sql += ` and email ilike $${params.length}`;
    }
    if (needle) {
      params.push(`%${needle}%`);
      sql += ` and email ilike $${params.length}`;
    }
    params.push(limit);
    sql += ` order by email asc limit $${params.length}`;
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => ({ email: r.email, name: r.name || r.email }));
  }
}
