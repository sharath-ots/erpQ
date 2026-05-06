# Deployment guide (developer + GHCR + Kubernetes)

This repo supports two common workflows:

- **Local developer builds**: build/run from source for fast iteration (Docker Desktop + Compose).
- **Test/Production builds**: build/push images to **GHCR** via GitHub Actions, then deploy using **Kubernetes (k3s)** manifests under `k8s/`.

---

## 1) Local developer builds (from source)

### 1.1 Prereqs

- Docker Desktop running
- Git + Node 20+ (only if you also run projects outside containers)

### 1.2 Run the whole stack (build + up)

From repo root:

```bash
docker compose up -d --build
docker compose ps
```

### 1.3 If you test from other LAN devices (important)

If your stack runs on a LAN server and you open it from laptops/phones, **do not use `localhost` in browser-facing URLs**.

Update these in `.env` to your server IP / LAN hostname:

- `NEXT_PUBLIC_AUTH_URL`
- `NEXT_PUBLIC_APIGATE_URL`
- `NEXT_PUBLIC_COMDASH_URL`
- `NEXT_PUBLIC_AUTHQ_URL`
- `AUTHQ_PUBLIC_BASE_URL`
- OAuth redirects:
  - `AUTHQ_GOOGLE_REDIRECT_URI`
  - `AUTHQ_ZOHO_REDIRECT_URI`

Then restart:

```bash
docker compose down
docker compose up -d --build
```

### 1.4 Useful URLs (default ports from `docker-compose.yml`)

- comDash: `http://<host>:13001`
- auth-web login: `http://<host>:3100/login`
- auth API health: `http://<host>:14100/health`
- apiGate health: `http://<host>:18080/health`
- RabbitMQ UI: `http://<host>:15672`
- ERP iframe proxy: `http://<host>:13002`

### 1.5 Run using prebuilt images (no build)

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
docker compose ps
```

---

## 2) CI/CD builds to GHCR (for test/prod)

This repo includes a workflow that builds and pushes images to GHCR:

- `.github/workflows/ghcr-build-and-push.yml`

### 2.1 What gets pushed

Images built:

- `ghcr.io/<owner>/erpq-core`
- `ghcr.io/<owner>/erpq-auth`
- `ghcr.io/<owner>/erpq-auth-web`
- `ghcr.io/<owner>/erpq-apigate`
- `ghcr.io/<owner>/erpq-comdash`
- `ghcr.io/<owner>/erpq-erp-proxy`

Tags produced by the workflow:

- branch name (e.g. `main`)
- git tag (e.g. `v0.1.1`)
- commit sha tag

### 2.2 How to trigger

- **Push to `main`** → builds and pushes
- **Push a tag** like `v0.1.1` → builds and pushes versioned tags

Example:

```bash
git tag v0.1.1
git push origin v0.1.1
```

---

## 3) Kubernetes (k3s) deployment (test/prod-like)

Kubernetes manifests live in:

- `k8s/base` (base resources)
- `k8s/overlays/*` (env overlays)

### 3.1 Prereqs (on the Linux server/VM)

- k3s installed (uses containerd; Docker is optional)
- Ingress controller: k3s default Traefik works with the included overlay patches

### 3.2 Configure DNS for your LAN

The base ingress expects hostnames:

- `dashboard.local`, `api.local`, `auth.local`, `login.local`, `core.local`, `erp-proxy.local`, `mq.local`
- optional `n8n.local`

Point these to your server IP using either:

- LAN DNS, or
- `hosts` entries on each laptop.

### 3.3 Create pull secret (only if GHCR images are private)

```bash
kubectl create namespace erpq
kubectl -n erpq create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username="<ghcr-username>" \
  --docker-password="<ghcr-pat-with-read:packages>" \
  --docker-email="unused@example.com"
```

Then deploy with:

- `k8s/overlays/k3s-dev-ghcr`

### 3.4 Create application secrets

Create a local file (not committed) based on:

- `k8s/overlays/k3s-dev/secrets.env.example`

Save as:

- `k8s/overlays/k3s-dev/secrets.env`

Apply:

```bash
kubectl create namespace erpq
kubectl -n erpq create secret generic erpq-app-secrets \
  --from-env-file=k8s/overlays/k3s-dev/secrets.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 3.5 Deploy

Base stack:

```bash
kubectl apply -k k8s/overlays/k3s-dev
```

With optional n8n + postgres:

```bash
kubectl apply -k k8s/overlays/k3s-dev-n8n
```

### 3.6 Verify

```bash
kubectl -n erpq get pods
kubectl -n erpq get svc
kubectl -n erpq get ingress
```

Logs:

```bash
kubectl -n erpq logs deploy/apigate
kubectl -n erpq logs deploy/auth
kubectl -n erpq logs deploy/comdash
kubectl -n erpq logs statefulset/rabbitmq
```

---

## 4) Developer workflow recommendation (best of both)

- **Develop fast** with `docker compose up -d --build` on your dev machine/server.
- **Promote to test/prod** by pushing to `main` (GHCR build) and deploying via `kubectl apply -k ...` on the Linux server.

