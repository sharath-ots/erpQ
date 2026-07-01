# Deploy

## Local

**Env:** copy `.env.example` → `.env` and fill in (at minimum `JWT_SECRET`, Zoho/ERP vars if you use them).  
**Compose:** `docker-compose.yml`

```powershell
cd "G:\ProjectsON\erpQ\03. code\erpQ"
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-local.ps1
```

---

## VM (erpq.lan)

**Env:** copy `.env.lan.example` → `.env.lan` and fill in (`JWT_SECRET`, `CITYQ_SERVICE_KEY`, `CITYQ_DB_PASSWORD`, `DOCQ_TOKEN_ENC_KEY_B64`, Zoho `AUTHQ_*`, `GHCR_*` only if using GHCR path below).  
**Compose (code changes):** `docker-compose.lan.build-from-source.yml`  
**Compose (GHCR only, after `git push main` + CI):** `docker-compose.production.yml` + `docker-compose.traefik.yml`

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\lan-deploy.ps1 -Services cityq-db,docq,apigate
```

GHCR on VM instead of build: `./scripts/lan-ghcr.sh pull` then `./scripts/lan-ghcr.sh up -d`

---

## Production

**Env:** copy `.env.production.example` → `.env.production` on the server and fill in (`JWT_SECRET`, `CITYQ_SERVICE_KEY`, `DOCQ_*`, `GHCR_OWNER`, `APP_VERSION`, URLs, secrets).  
**Compose:** `docker-compose.production.yml` + `docker-compose.traefik.yml`

```bash
cd /opt/erpq && ./deploy.sh
```

Or: push to `main` and let GitHub Actions build images and deploy (see `docs/CI_CD_GHCR.md`).
