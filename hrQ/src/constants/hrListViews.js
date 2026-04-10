/**
 * Curated HR screens (comDash sidebar). Keep menu paths in apiGate portal.js in sync.
 */
export const HR_LIST_VIEWS = [
  {
    key: "employees",
    label: "Employees",
    doctype: "Employee",
    listFields: ["name", "employee_name", "department", "designation", "status", "modified"],
  },
  {
    key: "departments",
    label: "Departments",
    doctype: "Department",
    listFields: ["name", "department_name", "modified"],
  },
  {
    key: "leaves",
    label: "Leave Applications",
    doctype: "Leave Application",
    listFields: ["name", "employee_name", "leave_type", "from_date", "to_date", "status", "modified"],
  },
  {
    key: "salary-slips",
    label: "Salary Slips",
    doctype: "Salary Slip",
    listFields: ["name", "employee_name", "month", "net_pay", "modified"],
  },
];

export function hrCuratedDocTypeSet() {
  return new Set(HR_LIST_VIEWS.map((v) => v.doctype));
}

export function getHrListViewConfig(doctype) {
  return HR_LIST_VIEWS.find((v) => v.doctype === doctype);
}
