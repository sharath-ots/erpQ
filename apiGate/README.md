# apiGate (`@cityq/apigate`)

API gateway: **Zoho OAuth → JWT**, **generic ERPNext DocType API**, reverse proxy to **coreQ**.

## Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | — | Liveness |
| POST | `/api/v1/auth/zoho/exchange` | — | Body `{ "access_token": "<Zoho access token>" }` → gateway JWT |
| GET | `/api/v1/partners/erpnext/meta/doctypes` | Bearer JWT | List DocType definitions (same as `/api/v1/erp/...` when ERP plugin on) |
| GET | `/api/v1/partners/erpnext/meta/doctype/:name` | Bearer JWT | One DocType row (schema metadata) |
| GET | `/api/v1/partners/erpnext/resource/:doctype/count` | Bearer JWT | Count (`filters` query JSON string) |
| GET | `/api/v1/partners/erpnext/resource/:doctype` | Bearer JWT | List documents (`fields`, `filters`, `or_filters`, `limit_*`, `order_by` as query JSON strings) |
| GET | `/api/v1/partners/erpnext/resource/:doctype/:name` | Bearer JWT | Get one |
| POST | `/api/v1/partners/erpnext/resource/:doctype` | Bearer JWT | Create (JSON body = fields) |
| PUT | `/api/v1/partners/erpnext/resource/:doctype/:name` | Bearer JWT | Update |
| DELETE | `/api/v1/partners/erpnext/resource/:doctype/:name` | Bearer JWT | Delete |
| POST | `/api/v1/partners/erpnext/method` | Bearer JWT | Body `{ "method": "dotted.path", "args": {} }` |
| * | `/api/v1/erp/*` | Bearer JWT | **Legacy mirror** of `/api/v1/partners/erpnext/*` (same handlers + separate rate bucket) |
| GET | `/api/v1/partners/payment/health` | — | Payment partner stub (own rate limit) |
| * | `/api/v1/core/*` | — | Proxied to coreQ as `/api/v1/*` |

## Environment

See [`.env.example`](./.env.example).

- **Zoho**: set `ZOHO_ACCOUNTS_BASE` to your region (`accounts.zoho.eu`, etc.).
- **ERPNext**: `ERPNEXT_URL` + **Integration User** API key/secret (User → API Access).
- **DocType allowlist** (gateway layer): `ERP_DEFAULT_DOCTYPES` and optional `ERP_ACCESS_MAP_JSON`. Use `"*"` in the map to allow any DocType string (Frappe still enforces permissions).

## Frontend (comDash)

1. OAuth with Zoho in the browser → obtain Zoho `access_token`.
2. `POST /api/v1/auth/zoho/exchange` with that token → store gateway JWT.
3. Call `/api/v1/partners/erpnext/...` (or legacy `/api/v1/erp/...`) with `Authorization: Bearer <gateway JWT>`. **crmQ** client: [`../crmQ`](../crmQ).

## Library

Shared ERP client: [`../frappeRestQ`](../frappeRestQ).

## Build

```bash
cd ../frappeRestQ && npm install && npm run build
cd ../apiGate && npm install && npm run build
```

## Docker

Build context must include `frappeRestQ` when using `file:../frappeRestQ` (build from monorepo root or multi-stage COPY both folders).

## Optional: embedding the Frappe desk in an iframe

Curated **CRM in comDash** uses **apiGate REST only** (no iframe). If you still embed ERPNext’s UI elsewhere, the browser will block it unless the **ERPNext host** allows framing: on nginx, relax or remove `X-Frame-Options: SAMEORIGIN` and set a strict **Content-Security-Policy** `frame-ancestors` listing only your portal origin (never use `*` in production). Example:

```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://your-portal.example.com;";
```

Restart nginx after changes. Login inside an iframe may hit **CSRF** restrictions; changing Frappe CSRF settings reduces security — prefer the portal’s REST-backed screens and **“Other doctypes”** for rare DocTypes instead of framing the full desk.
