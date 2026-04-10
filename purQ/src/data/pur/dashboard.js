export const kpis = [
  {
    key: "totalSuppliers",
    label: "Total Suppliers",
    value: 142,
    change: { percentage: 3.2, since: "last quarter" },
    icon: "material-symbols:store-outline",
  },
  {
    key: "pendingOrders",
    label: "Pending Orders",
    value: 28,
    change: { percentage: -5.1, since: "last month" },
    icon: "material-symbols:receipt-long-outline",
  },
  {
    key: "pendingInvoices",
    label: "Pending Invoices",
    value: 17,
    change: { percentage: -2.4, since: "last month" },
    icon: "material-symbols:description-outline",
  },
  {
    key: "purchaseValue",
    label: "Purchase Value (MTD)",
    value: 284500,
    change: { percentage: 8.7, since: "last month" },
    icon: "material-symbols:payments-outline",
    isCurrency: true,
  },
];

export const recentOrders = [
  { id: "PO-2025-001", supplier: "Acme Corp", amount: 12500, status: "To Receive", date: "2025-04-01" },
  { id: "PO-2025-002", supplier: "Global Supplies", amount: 8200, status: "To Bill", date: "2025-04-03" },
  { id: "PO-2025-003", supplier: "TechParts Ltd", amount: 31000, status: "Completed", date: "2025-03-28" },
  { id: "PO-2025-004", supplier: "FastFreight", amount: 4750, status: "Draft", date: "2025-04-05" },
  { id: "PO-2025-005", supplier: "Reliable Inc", amount: 9300, status: "To Receive", date: "2025-04-06" },
];

export const topSuppliers = [
  { name: "Acme Corp", orders: 34, value: 125000 },
  { name: "Global Supplies", orders: 28, value: 98500 },
  { name: "TechParts Ltd", orders: 21, value: 87200 },
  { name: "FastFreight", orders: 18, value: 54300 },
  { name: "Reliable Inc", orders: 15, value: 43100 },
];
