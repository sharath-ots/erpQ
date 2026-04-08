# CityQ ERP — Platform Shell (Monorepo Map)

This repository hosts **separate deployable projects** that together match the enterprise architecture (portal → API Gateway → core / services → infrastructure).

| Project | Role |
|--------|------|
| [`comDash`](./comDash) | Next.js **central portal**: unified shell, role-aware layout, **module loader** (lazy-loaded micro-frontends or iframe/deep-link placeholders). |
| [`apiGate`](./apiGate) | Node.js **API gateway library** (and optional standalone server): routing, auth hooks, rate limiting, versioning, TLS termination helpers. |
| [`coreQ`](./coreQ) | Node.js **core BFF / orchestration** API (Express/Fastify): aggregates calls to ERPNext, microservices, and shared services. |
| [`authQ`](./authQ) | **Identity / access** service: OIDC/OAuth2, SSO integration, RBAC/ABAC policy checks, token issuance for the gateway and UIs. |
| [`mQ`](./mQ) | **RabbitMQ** deployment assets (K8s, local Docker Compose) and optional AMQP client utilities. |
| [`frappeRestQ`](./frappeRestQ) | **Shared Frappe REST library** (DocType CRUD, methods) — used by **apiGate** and any Node service. |

See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for the condensed requirement notes.

## Local prerequisites

- Node.js 20+
- Docker Desktop (Kubernetes enabled)
- Optional: `kubectl`, Helm

## Next steps (implementation order)

1. `comDash` — portal shell + module registry contract.
2. `authQ` — OIDC client/server boundaries and JWT for gateway.
3. `apiGate` — enforce auth + route to `coreQ`.
4. `coreQ` — health, config, proxy to ERPNext when wired.
5. `mQ` — cluster RabbitMQ + publish/subscribe smoke tests.

Each project folder contains its own `README.md`, `Dockerfile`, and `k8s/` manifests (skeleton).
