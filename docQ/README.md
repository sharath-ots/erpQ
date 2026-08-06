# docQ database

docQ uses the **platform Postgres** (`cityq-db`), not a dedicated database container.

| Item | Value |
|------|--------|
| Server env | `CITYQ_DATABASE_URL` (e.g. `postgres://cityq:pass@cityq-db:5432/cityq`) |
| Module schema | `docq` (`DOCQ_PG_SCHEMA`) |
| Migrations | `docQ/migrations/*.sql` (applied in order; tracked in `docq.schema_migrations`) |
| Override | `DOCQ_DATABASE_URL` (optional full connection string with `search_path`) |

## Features (v0.2)

- **WorkDrive** storage (browse, upload) with per-user OAuth refresh tokens
- **Scratch pad** — private uncategorised files (`zone=scratch`)
- **Managed library** — metadata, versioning, approval workflows
- **Workflow engine** — preset per doc type or ad-hoc approver chains (approve / request changes / forward)
- **ERPNext org cache** — Employee / Department / User roles for approver resolution
- **Sharing** — read/write grants per document
- **MQ events** — `doc.submitted`, `doc.approved`, `doc.changes_requested`, `doc.forwarded`

## API (via apiGate `/api/v1/partners/workdrive`)

| Path | Purpose |
|------|---------|
| `GET /api/v1/docs/documents` | List/search documents |
| `GET /api/v1/docs/documents/:id` | Detail + history + shares |
| `POST /api/v1/docs/scratch/upload` | Upload to scratch pad |
| `POST /api/v1/docs/documents/:id/promote` | Scratch → managed |
| `POST /api/v1/docs/documents/:id/transition` | Workflow actions |
| `GET /api/v1/docs/inbox` | Approver + author queues |
| `GET/PUT /api/v1/docs/workflows/:docType` | Preset workflow admin |
| `GET /api/v1/docs/org/users` | User picker (ERPNext) |

## Env (docQ service)

| Variable | Purpose |
|----------|---------|
| `DOCQ_TOKEN_ENC_KEY_B64` | Encrypt Zoho refresh tokens |
| `CITYQ_SERVICE_KEY` | authQ → docQ token upsert |
| `ERPNEXT_*` | Org sync (Employee, User) |
| `CITYQ_MQ_URL` | Optional workflow notifications |
| `DOCQ_SCRATCH_ROOT` / `DOCQ_MANAGED_ROOT` | WorkDrive folder IDs |
| `DOCQ_APPROVAL_SLA_DAYS` | Default task due date |

Tables live in schema `docq`. Cross-module links use UUIDs / external IDs only.

Reset docQ data only (LAN VM):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\lan-reset-docq-schema.ps1
```
