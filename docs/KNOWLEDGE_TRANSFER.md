# erpQ — Knowledge Transfer (KT)

**Audience:** DB administrators, frontend developers, backend developers, DevOps  
**Purpose:** Hand over ongoing development and operations of the CityQ / erpQ platform  
**Companion docs:** [DEPLOY.md](./DEPLOY.md) · [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) · [PLATFORM_ARCHITECTURE_PLAN.md](./PLATFORM_ARCHITECTURE_PLAN.md) · [CI_CD_GHCR.md](./CI_CD_GHCR.md)

**PowerPoint (Frontend & API walkthrough):** [KNOWLEDGE_TRANSFER_SLIDES_FE_API.md](./KNOWLEDGE_TRANSFER_SLIDES_FE_API.md) — 27 slides + live demo script; copy into PowerPoint or generate `.pptx` via Pandoc (see appendix C in that file).

---

## How to present this to the team (30–45 min session)

| Segment | Time | What to show |
|--------|------|----------------|
| **1. Why this shape** | 5 min | One browser entry (comDash), one API edge (apiGate), ERP as system of record — slide §2 diagram |
| **2. Live walkthrough** | 10 min | Use slide deck [KNOWLEDGE_TRANSFER_SLIDES_FE_API.md](./KNOWLEDGE_TRANSFER_SLIDES_FE_API.md) § Slide 24 — Network tab, `/api/v1` proxy, `/health` |
| **3. Role handoff** | 15 min | FE/API: slide deck §1–27; DB: §8; Backend: §10; DevOps: §5.7–5.8 |
| **4. Ongoing work** | 10 min | §5–§7: how you add services, ERP routes, UI, MQ, deploy |
| **5. Q&A + doc link** | 5 min | Share this file + `.env.*.example` — secrets never in git |

**Facilitator tip:** Print or share §11 “Quick reference” as a one-pager. Run `docker compose ps` and `curl http://localhost:18080/health` (or LAN ports from `.env`) so the team sees upstream status (`docq`, `erp`, `coreq`, `authq`).

---

## 1. What erpQ is

erpQ is a **monorepo of deployable services** that wrap ERPNext (and other backends) behind a unified portal:

| Project | Role |
|---------|------|
| **comDash** | Next.js portal shell: layout, sidebar, module outlet, Ant Design UI |
| **apiGate** | Public API edge: JWT, ERP proxy, partner plugins, MQ publish, portal menu |
| **authQ** | Login + OAuth (Zoho/Google) + JWT contract shared with apiGate |
| **coreQ** | Settings / feature flags (`modules.json`, integrations) |
| **docQ** | Document workflows + Zoho WorkDrive; Postgres schema `docq` |
| **frappeRestQ** | Shared Frappe REST client library (used by apiGate, services) |
| **mQ** | RabbitMQ assets + optional `@cityq/mq-client` |
| **crmQ / hrQ / purQ** | Domain UI packages **bundled into comDash** (not separate public sites today) |

**Design rules (non-negotiable for new work):**

1. Browsers talk to **comDash** and **apiGate** only — not directly to ERPNext for app APIs.
2. All application APIs use **CityQ JWT** (cookie `cityq_access_token` or `Authorization: Bearer`).
3. **JavaScript / JSX only** in app source (no TypeScript in new code).
4. Cross-module data in Postgres: **separate schemas** (`docq`, future `hrq`, …), **no FKs across modules** — link by UUID / external IDs only.

---

## 2. Logical architecture

```mermaid
flowchart TB
  subgraph clients [Clients]
    Browser[Browser]
  end
  subgraph portal [Portal]
    comDash[comDash]
    mods[crmQ hrQ purQ docQ UI]
    comDash --> mods
  end
  subgraph edge [Platform edge]
    apiGate[apiGate]
    auth[authQ + auth-web]
    core[coreQ]
  end
  subgraph data [Data and messaging]
    pg[(cityq-db Postgres)]
    mq[RabbitMQ]
    docqSvc[docQ service]
  end
  subgraph erp [Enterprise]
    ERP[ERPNext Frappe REST]
    Zoho[Zoho WorkDrive / OAuth]
  end
  Browser --> comDash
  comDash -->|"/api/v1/* proxy"| apiGate
  Browser --> auth
  apiGate --> auth
  apiGate --> core
  apiGate --> ERP
  apiGate -->|"/partners/workdrive"| docqSvc
  docqSvc --> pg
  docqSvc --> Zoho
  apiGate --> mq
  mq -.->|events| apiGate
```

**Request path (typical API call):**

1. User logs in via **auth-web** → JWT stored in browser (`localStorage` + optional cookie).
2. comDash page calls `apiFetch("/api/v1/...")` → same origin.
3. Next.js route proxies to **apiGate** (`APIGATE_INTERNAL_URL` in Docker).
4. apiGate verifies JWT, applies rate limits, routes to ERP partner, docQ proxy, coreQ, or MQ.

---

## 3. Physical deployment (three modes)

| Mode | When | Entry command / doc |
|------|------|---------------------|
| **Local dev** | Developer machine | `docker compose up -d --build` — [DEPLOYMENT_GUIDE.md §1](./DEPLOYMENT_GUIDE.md) |
| **LAN VM** | Shared test server (`erpq.lan`) | `scripts/lan-deploy.ps1` + `.env.lan` — [DEPLOY.md](./DEPLOY.md) |
| **Production** | Internet-facing host | `docker-compose.production.yml` + `docker-compose.traefik.yml` or GHCR + SSH deploy — [DEPLOY.md](./DEPLOY.md), [CI_CD_GHCR.md](./CI_CD_GHCR.md) |
| **Kubernetes (k3s)** | Test/prod-like cluster | `kubectl apply -k k8s/overlays/...` — [k8s/README.md](../k8s/README.md) |

**Default Docker services (root `docker-compose.yml`):**  
`rabbitmq`, `cityq-db`, `docq`, `core`, `auth`, `auth-web`, `apigate`, `comdash`, `erp-proxy` (optional iframe).

**Images pushed to GHCR (CI):** `erpq-core`, `erpq-auth`, `erpq-auth-web`, `erpq-apigate`, `erpq-comdash`, `erpq-erp-proxy`, `erpq-docq`.

---

## 4. Environments and secrets (everyone)

| File | Use |
|------|-----|
| `.env.example` | Local template |
| `.env.lan.example` | LAN VM |
| `.env.production.example` | Production |

**Must align across services (or you get 401 / logout):**

- `JWT_SECRET` — authQ, apiGate, docQ
- `CITYQ_SERVICE_KEY` — service-to-service headers where used
- `CITYQ_DB_PASSWORD` / `CITYQ_DATABASE_URL` — Postgres
- `DOCQ_TOKEN_ENC_KEY_B64` — docQ token encryption (LAN/prod)
- ERP: `ERPNEXT_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
- MQ: `CITYQ_MQ_URL` (e.g. `amqp://user:pass@rabbitmq:5672`)

**LAN rule:** Browser-facing URLs must use the **server IP/hostname**, not `localhost`, when testing from other devices (`NEXT_PUBLIC_*`, OAuth redirect URIs).

---

## 5. Ongoing activity guides (by topic)

### 5.1 Add a new backend service (e.g. `inventoryQ`)

**Backend / DevOps checklist:**

1. Create folder `inventoryQ/` with `package.json`, `Dockerfile`, `src/index.js`, `/health`.
2. Add service to `docker-compose.yml` (and `docker-compose.lan.build-from-source.yml`, `docker-compose.production.yml` if promoted).
3. Wire env in `.env.*.example` (port, DB URL if needed, `JWT_SECRET`).
4. If browser-facing: expose via **apiGate** (proxy plugin or dedicated routes) — do not expose a new public port without review.
5. Add GHCR build job in `.github/workflows/ghcr-build-and-push.yml` when ready for prod.
6. Optional K8s: copy pattern from `k8s/base/` deployments + overlay image tags.

**If the service needs Postgres:**

- Use shared **`cityq-db`**, new schema e.g. `inventory` (see docQ pattern in §8).
- Migrations in `inventoryQ/migrations/*.sql`, tracked in `{schema}.schema_migrations`.

**Register in apiGate health** (optional): extend `/health` in `apiGate/src/server.js` like `docq` upstream check.

---

### 5.2 Integrate more ERPNext APIs

ERP access is centralized in **apiGate** via `frappeRestQ` and the ERPNext partner plugin.

| Task | Where |
|------|--------|
| REST CRUD (list/get/create/update/delete) | Already at `/api/v1/partners/erpnext/resource/:doctype` — see [apiGate/README.md](../apiGate/README.md) |
| Whitelisted methods | `POST /api/v1/partners/erpnext/method` with `{ "method": "dotted.path", "args": {} }` |
| DocType allowlist | `ERP_DEFAULT_DOCTYPES`, `ERP_ACCESS_MAP_JSON` in apiGate env |
| Enable/disable ERP routes | `coreQ` `modules.erp` + valid `ERPNEXT_*` credentials |
| Server-side only (workers, MQ consumer) | `getFrappeClient()` in apiGate — see `apiGate/src/services/mqWorkflowConsumer.js` |

**Backend steps for a new DocType or method:**

1. Confirm Integration User has Frappe permissions for that DocType/method.
2. Add DocType to allowlist env if not using `"*"` in access map.
3. From UI: use existing gateway client patterns in `crmQ` (`gatewayErpNextClient`) or `apiFetch` from comDash.
4. For **async side effects** (create PO after lead): publish MQ event (§5.5) and handle in a consumer.

**Do not** call ERPNext from the browser with API keys; keys stay on apiGate/coreQ/docQ only.

---

### 5.3 Add portal pages / screens

**Frontend checklist:**

1. **Route:** Add under `comDash/src/app/(portal)/m/<module>/...` or handle in `ModuleOutlet.jsx` (pathname → component), as done for `/m/crmq`, `/m/docq`.
2. **Sidebar:** Add entry in `comDash/src/ui/routes/sitemap.js` (static menu) and/or ensure **apiGate** `GET /api/v1/portal/menu` includes the item (`apiGate/src/routes/portal.js`).
3. **API calls:** Use `@/lib/apigate` — `apiFetch`, `getAccessToken`, `apiBase` (proxied `/api/v1`).
4. **Module telemetry (optional):** On navigation, shell already posts `portal.module_viewed` via `/api/v1/mq/events` from `ModuleOutlet.jsx`.

**docQ example:** catch-all page `comDash/src/app/(portal)/m/docq/[[...slug]]/page.jsx` renders `ModuleOutlet`; sub-routes like `/m/docq/register` mapped in `ModuleOutlet.jsx`.

---

### 5.4 Add ERP modules or custom modules

Two patterns in use today:

| Pattern | Description | Example |
|---------|-------------|---------|
| **A — Package in monorepo** | Folder `crmQ/`, webpack alias in `comDash/next.config.js`, routes in `ModuleOutlet` | crmQ, hrQ, purQ |
| **B — Microservice + gateway** | Separate container, proxied partner routes | docQ + workdrive partner |

**Custom module (UI package) steps:**

1. Create `myModuleQ/` with screens and API helpers (call apiGate only).
2. In `comDash/next.config.js`: `resolve.alias["@cityq/mymoduleq"]` → package path; Docker `comDash/Dockerfile` must **COPY** sibling package.
3. Register routes in `ModuleOutlet.jsx` and menu in sitemap + `portal.js`.
4. Toggle visibility: `CITYQ_PORTAL_*` env vars on apiGate or `coreQ/settings/modules.json`.

**ERP desk iframe:** Use `deskBaseUrl` / `erp-proxy` — ERP embedded routes under `/m/.../iframe/...` (see crmQ iframe patterns).

---

### 5.5 Integrate third-party APIs (partner plugins)

**Pattern:** Fastify plugin under `apiGate/src/partners/<name>/plugin.js`, registered in `apiGate/src/server.js`.

| Partner | Prefix | Notes |
|---------|--------|--------|
| ERPNext | `/api/v1/partners/erpnext` | Rate-limited; legacy mirror `/api/v1/erp` |
| Payment (stub) | `/api/v1/partners/payment` | Template for new partners |
| WorkDrive / docQ | `/api/v1/partners/workdrive` | HTTP proxy to `DOCQ_URL` + JWT |

**Steps for a new partner:**

1. Add `plugin.js` + `routes.js` with `preHandler: jwtVerify` (unless public health).
2. Register with `app.register(..., { prefix: "/api/v1/partners/<name>" })`.
3. Add env vars to `apiGate/src/config.js` and `.env.*.example`.
4. Document routes in `apiGate/README.md`.
5. If secrets are stored per-tenant: prefer **coreQ** or service DB, not client bundle.

---

### 5.6 Message queue (RabbitMQ)

**Infrastructure:** Service `rabbitmq` in compose; K8s StatefulSet in `k8s/base/`; management UI port `15672`.

**Contract (application):**

| Item | Value |
|------|--------|
| Exchange | `cityq.events` (topic, durable) |
| Routing key | Event `type` string (e.g. `crm.lead.created`, `portal.module_viewed`) |
| Publish from browser | `POST /api/v1/mq/events` (JWT) → `apiGate/src/routes/mq.js` |
| Publish from server | `apiGate/src/services/mqPublisher.js` or `amqplib` in any service |
| Contract doc | `apiGate/src/contracts/cityqMqContract.js` |

**Enable MQ:** Set `CITYQ_MQ_URL` on apiGate (and any consumer service). If unset, publish returns `503` / consumer no-ops.

**Add a workflow:**

1. Define event type in `cityqMqContract.js` (naming: `module.entity.action`).
2. Publish from UI or backend after the business action.
3. Add consumer: bind queue to routing key — example consumer `apigate.workflows` in `mqWorkflowConsumer.js` (binds `crm.lead.created`, writes to ERP).
4. For new services: separate queue name per service; bind topic patterns (`crm.#`, `hr.#`, …).

**Optional shared library:** `mQ/amqp-client` (`@cityq/mq-client`) for assert exchange/queue conventions.

**Operational practices:** Use durable queues, persistent messages, dead-letter queues for retries (production); change default RabbitMQ password outside dev.

---

### 5.7 Kubernetes and Traefik

**Kubernetes (k3s):**

- Manifests: `k8s/base` + `k8s/overlays/k3s-dev`, `k3s-dev-ghcr`, etc.
- Namespace: `erpq`
- Ingress hosts (baseline): `dashboard.local`, `api.local`, `auth.local`, `login.local`, `core.local`, `erp-proxy.local`, `mq.local` — see `k8s/base/ingress.yaml`
- Secrets: `k8s/overlays/k3s-dev/secrets.env` (not committed)
- Deploy: `kubectl apply -k k8s/overlays/k3s-dev`
- k3s includes **Traefik** as ingress controller by default

**Docker Compose + Traefik (production/LAN with HTTPS):**

- Overlay: `docker-compose.traefik.yml` — Traefik v3, Docker provider, labels on `comdash`, `apigate`, `auth-web`, etc.
- TLS: `traefik/dynamic/` + optional Let's Encrypt (`TRAEFIK_ACME_ENABLED`)
- Single host routing: `PUBLIC_HOST` with path prefixes (`/api-gateway`, `/auth`, `/login`, …)

**Team rule:** Pick **one** edge per environment — nginx-proxy profile, Traefik compose overlay, or K8s ingress — avoid double proxies without intent.

---

### 5.8 Full deployment process (summary)

```mermaid
flowchart LR
  dev[Develop locally] --> commit[Push main or tag]
  commit --> ci[GitHub Actions build]
  ci --> ghcr[GHCR images]
  ghcr --> deploy{Target}
  deploy --> lan[LAN: lan-deploy.ps1 or lan-ghcr.sh]
  deploy --> prod[Prod: deploy.sh / ghcr-deploy]
  deploy --> k8s[k8s: kubectl apply -k]
```

| Stage | Action |
|-------|--------|
| Develop | `docker compose up -d --build`, fix code, hit `/health` endpoints |
| LAN promote | Copy `.env.lan`, run `scripts/lan-deploy.ps1` (optional `-Services docq,apigate`) |
| CI | Push `main` or tag `v*` → images to `ghcr.io/<owner>/erpq-*` |
| Production | `.env.production` on server, `docker compose -f docker-compose.production.yml -f docker-compose.traefik.yml up -d` or automated SSH deploy |
| Verify | `docker compose ps`, apiGate `/health`, comDash login, RabbitMQ UI, docQ migrations applied on startup |
| docQ schema reset (LAN only) | `scripts/lan-reset-docq-schema.ps1` |

---

## 6. Repository map (where to look first)

| Need | Path |
|------|------|
| Portal menu API | `apiGate/src/routes/portal.js` |
| Module routing | `comDash/src/components/portal/ModuleOutlet.jsx` |
| API client (browser) | `comDash/src/lib/apigate.js` |
| Next → apiGate proxy | `comDash/src/app/api/v1/[...path]/route.js` |
| ERP partner | `apiGate/src/partners/erpnext/` |
| MQ | `apiGate/src/contracts/cityqMqContract.js`, `apiGate/src/services/mqPublisher.js` |
| Feature flags | `coreQ/settings/modules.json`, `coreQ/src/services/settingsStore.js` |
| docQ DB | `docQ/migrations/`, `docQ/README.md` |
| Stack compose | `docker-compose.yml`, `docker-compose.traefik.yml` |
| CI/CD | `.github/workflows/ghcr-build-and-push.yml` |

---

## 7. Data architecture (DB manager focus)

**Current model:** ERPNext remains **system of record** for ERP DocTypes; platform Postgres holds **module-specific** state (docQ workflows, tokens, refs).

| Database | Host | Schemas |
|----------|------|---------|
| **cityq** (Postgres 16) | `cityq-db` container | `docq` today; add `hrq`, `inventory`, etc. per module |

**docQ conventions:**

- Env: `CITYQ_DATABASE_URL`, `DOCQ_PG_SCHEMA=docq`
- Migrations: `docQ/migrations/*.sql` applied on startup (`docQ/src/db/migrate.js`)
- Tracking table: `docq.schema_migrations`
- Cross-module links: e.g. `erpnext_refs.erp_docname` — **no FK** to other schemas

**Adding a new module schema:**

1. `create schema if not exists mymodule;` in `000_schema.sql`
2. Numbered migrations `001_*.sql`, `002_*.sql`
3. Document in module `README.md` (same pattern as `docQ/README.md`)
4. Backup/restore: volume `cityq_pg_data` — coordinate with DevOps before major DDL

**Future “strict isolation” (Option B in architecture plan):** separate DB per domain + MQ only — not required for current ERP-centric UI paths. See [PLATFORM_ARCHITECTURE_PLAN.md §6](./PLATFORM_ARCHITECTURE_PLAN.md).

---

## 8. Role playbook — Database administrator

| Responsibility | Actions |
|----------------|---------|
| **Provision** | Ensure `cityq-db` healthy; rotate `CITYQ_DB_PASSWORD` via compose/env + app restart |
| **Migrations** | Module teams ship SQL in `{service}/migrations/`; verify `schema_migrations` after deploy |
| **Monitoring** | Connection counts, disk on `cityq_pg_data`, slow queries on `docq.*` tables |
| **Security** | No superuser creds in git; limit exposure of port `15432` to dev LAN only |
| **Backup** | Regular pg_dump of database `cityq` (all schemas); test restore on staging |
| **Coordination** | Schema names are owned per module — avoid `public` tables for app data |

**When devs add tables:** Review migration PR for indexes, FKs **within** schema only, and PII columns (encryption at app layer e.g. `DOCQ_TOKEN_ENC_KEY_B64`).

---

## 9. Role playbook — Frontend developer

| Responsibility | Actions |
|----------------|---------|
| **Run UI** | `comDash`: `npm run dev` or full stack via Docker |
| **New screens** | App router under `src/app/(portal)/`, wire `ModuleOutlet`, update `sitemap.js` |
| **API** | Always `apiFetch` / same-origin `/api/v1` — never embed ERP API keys |
| **Auth** | `getAccessToken()`, hash `cityq_token=` handling in `apigate.js` |
| **Styling** | Ant Design + Tailwind; shared UI under `comDash/src/shared-ui` |
| **Domain packages** | Import from `@cityq/crmq` etc.; aliases in `next.config.js` |
| **Build** | `npm run build` — standalone output for Docker; sibling packages copied in Dockerfile |
| **Env** | `NEXT_PUBLIC_*` only for URLs safe in browser; internal gateway URL is server-side `APIGATE_INTERNAL_URL` |

**Common pitfalls:**

- Using `localhost` in `NEXT_PUBLIC_*` when testers use another machine on LAN.
- Calling ERPNext origin directly — breaks auth and CORS model.
- Forgetting to register route in `ModuleOutlet` after adding a page file.

---

## 10. Role playbook — Backend developer

| Responsibility | Actions |
|----------------|---------|
| **apiGate** | New routes, partners, rate limits, JWT hooks (`apiGate/src/server.js`) |
| **authQ** | OAuth redirects, token issuance (`authQ/src/routes/oauth.js`) |
| **coreQ** | Module flags, merged settings JSON |
| **docQ / new services** | Fastify/Express handlers, `CITYQ_SERVICE_KEY`, JWT verify |
| **ERP** | `frappeRestQ` + partner routes; respect allowlists |
| **MQ** | Publish/subscribe using `cityq.events` contract |
| **Libraries** | Shared ERP client: `frappeRestQ`; publish MQ helpers: `mQ/amqp-client` |

**Service template:**

- `/health` endpoint
- Config from env (`src/config.js`)
- Docker multi-stage build
- Log structured errors; return `{ error: "code" }` JSON
- Service-to-service: `X-CityQ-Service-Key` where already used in coreQ/docQ patterns

**Testing integration:**

```bash
curl -s http://localhost:18080/health | jq
curl -s -H "Authorization: Bearer <jwt>" http://localhost:18080/api/v1/partners/erpnext/meta/doctypes
```

---

## 11. Quick reference — ports (local compose defaults)

| Service | Host port (typical) | Health |
|---------|---------------------|--------|
| comDash | 13000 | `GET /` |
| auth-web | 3100 | `/login` |
| auth API | 14100 | `/health` |
| apiGate | 18080 | `/health` |
| coreQ | 14000 | `/api/v1/health` |
| docQ | 14160 | `/health` |
| Postgres | 15432 | `pg_isready` |
| RabbitMQ AMQP / UI | 5672 / 15672 | management UI |

*(Exact ports come from `.env` `*_PUBLISH_*` variables.)*

---

## 12. Suggested team operating model

| Cadence | Activity |
|---------|----------|
| Per feature | Branch → PR → review migrations + env example changes together |
| Per release | Tag `v*`, GHCR build, deploy checklist from [DEPLOY.md](./DEPLOY.md) |
| Per incident | apiGate `/health` first; then service logs; MQ management UI if events stuck |
| Architecture changes | Update [PLATFORM_ARCHITECTURE_PLAN.md](./PLATFORM_ARCHITECTURE_PLAN.md) and this KT doc |

---

## 13. Handover checklist (sign-off)

- [ ] Team has access to repo, GHCR, servers, `.env` secrets store (not git)
- [ ] Everyone can log in to portal on LAN/prod URL
- [ ] `apiGate /health` shows expected `erp`, `docq`, `coreq`, `authq`
- [ ] DB admin: backup job documented; migration ownership clear
- [ ] Frontend: can add a dummy route in `ModuleOutlet` in dev
- [ ] Backend: can call ERP list endpoint with test JWT
- [ ] DevOps: one deployment path practiced (compose **or** k8s **or** Traefik prod)
- [ ] RabbitMQ: `CITYQ_MQ_URL` understood; sample event published

| Role | Name | Date |
|------|------|------|
| Engineering lead | | |
| DB admin | | |
| Frontend lead | | |
| Backend lead | | |
| DevOps | | |

---

*Document version: 1.0 · Maintained in `docs/KNOWLEDGE_TRANSFER.md` — update when adding services, partners, or deployment paths.*
