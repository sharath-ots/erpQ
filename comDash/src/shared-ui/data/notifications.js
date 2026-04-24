const now = Date.now();

export const notifications = [
  {
    id: "n1",
    title: "Welcome to CityQ Portal",
    description: "Your workspace is ready.",
    createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
    unread: true,
    type: "info",
    avatar: null,
  },
  {
    id: "n2",
    title: "ERP Sync",
    description: "ERPNext connection is configured.",
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    unread: false,
    type: "success",
    avatar: null,
  },
];

