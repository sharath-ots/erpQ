# frappeRestQ (`@cityq/frapperestq`)

Generic **Frappe REST** client for server-side use (Node.js): list/get/create/update/delete documents and call whitelisted methods.

## Usage

```ts
import { FrappeClient } from "@cityq/frapperestq";

const frappe = new FrappeClient({
  baseUrl: "https://your-site.frappe.cloud",
  auth: {
    kind: "token",
    apiKey: process.env.ERPNEXT_API_KEY!,
    apiSecret: process.env.ERPNEXT_API_SECRET!,
  },
});

const rows = await frappe.listDocuments("Customer", {
  fields: ["name", "customer_name"],
  filters: [["disabled", "=", 0]],
  limit_page_length: 20,
});

const one = await frappe.getDocument("Customer", "CUST-001");

await frappe.createDocument("Customer", { customer_name: "Acme" });
```

## Filters

`filters` / `or_filters` follow Frappe’s JSON format: array of `[field, operator, value]` tuples.

## ERPNext permissions

The API key must belong to a **User** with Role Profile / permissions for each DocType. This library does not bypass Frappe security.

## `countDocuments`

Uses `frappe.desk.reportview.get_count` — ensure that method is permitted for your integration user (or remove usage).
