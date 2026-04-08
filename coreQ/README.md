# coreQ (`@cityq/coreq`)

Node.js **orchestration / BFF** layer: aggregates ERPNext (Frappe SDK), microservices, and shared services behind a stable API for the portal and gateway.

## Layout

```
src/
  config/       # Environment and typed config
  routes/       # HTTP routes (versioned under /api/v1)
  services/     # Domain services, ERP adapters, clients
  index.ts      # Fastify bootstrap
```

## Scripts

- `npm run dev` — local dev with hot reload (`tsx`)
- `npm run build` — compile to `dist/`
- `npm start` — run compiled server

## Container

```bash
docker build -t cityq/coreq:latest .
```

## Kubernetes

Apply manifests in `k8s/` (adjust image registry and ConfigMaps/Secrets for `ERPNEXT_BASE_URL`, `AUTH_ISSUER_URL`, etc.).
