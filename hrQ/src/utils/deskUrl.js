import { DESK_PATHS } from "../constants/deskPaths.js";

export function joinDeskUrl(baseUrl, path) {
  const b = (baseUrl ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!b) return p;
  return `${b}${p}`;
}

export function joinDeskUrlWithQuery(baseUrl, path, query) {
  const base = joinDeskUrl(baseUrl, path);
  const q = String(query ?? "").trim().replace(/^\?/, "");
  if (!q) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${q}`;
}

export function deskQuickLinks(deskBase) {
  if (!deskBase?.trim()) return [];
  const b = deskBase.replace(/\/$/, "");
  return [
    { key: "desk-home", label: "Desk home", href: `${b}${DESK_PATHS.home}` },
    { key: "desk-hr", label: "HR module", href: `${b}${DESK_PATHS.hr}` },
    { key: "desk-employee", label: "Employees", href: `${b}${DESK_PATHS.employee}` },
    { key: "desk-dept", label: "Departments", href: `${b}${DESK_PATHS.department}` },
    { key: "desk-leave", label: "Leave Applications", href: `${b}${DESK_PATHS.leaveApplication}` },
    { key: "desk-salary", label: "Salary Slips", href: `${b}${DESK_PATHS.salarySlip}` },
  ];
}
