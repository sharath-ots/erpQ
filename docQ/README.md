# docQ database

docQ uses the **platform Postgres** (`cityq-db`), not a dedicated database container.

| Item | Value |
|------|--------|
| Server env | `CITYQ_DATABASE_URL` (e.g. `postgres://cityq:pass@cityq-db:5432/cityq`) |
| Module schema | `docq` (`DOCQ_PG_SCHEMA`) |
| Migrations | `docQ/migrations/*.sql` (applied in order; tracked in `docq.schema_migrations`) |
| Override | `DOCQ_DATABASE_URL` (optional full connection string with `search_path`) |

Tables live in schema `docq`: `documents`, `transition_history`, `workflow_definitions`, `erpnext_refs`, `zoho_tokens`.

Cross-module links use **UUIDs / external IDs only** (e.g. `erpnext_refs.erp_docname`) — no FKs to other modules' schemas.

Future modules (e.g. hrQ) add their own schema (`hrq`) and migration folder on the same `CITYQ_DATABASE_URL`.

Reset docQ data only (LAN VM):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\lan-reset-docq-schema.ps1
```
