const searchResult = {
  breadcrumbs: [
    [
      { label: "Apps", href: "/#", active: false },
      { label: "CRM", href: "/m/crmq", active: true },
    ],
  ],
  files: [
    {
      name: "Portal menu",
      path: "/api/v1/portal/menu",
      icon: "material-symbols:menu-open-rounded",
    },
    {
      name: "ERP Proxy",
      path: "/m/crmq/iframe/app",
      icon: "material-symbols:iframe-outline",
    },
  ],
  contacts: [
    { name: "Demo User", avatar: "" },
  ],
  tags: ["crm", "erpnext", "portal", "dashboard"],
};

export default searchResult;

