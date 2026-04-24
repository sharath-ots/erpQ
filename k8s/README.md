# erpQ Kubernetes manifests (k3s-friendly)

This folder contains Kustomize-based Kubernetes manifests for the erpQ stack.

## Layout

- `base/`: common manifests (Deployments, Services, ConfigMap/Secret skeleton, RabbitMQ StatefulSet, Ingress)
- `overlays/`: environment-specific overrides (images, hostnames, TLS, storage class, etc.)

## Quick start (local k3s)

0) (Optional) If your images are private on GHCR, create an image pull secret:

```bash
kubectl -n erpq create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username="<ghcr-username>" \
  --docker-password="<ghcr-pat-with-read:packages>" \
  --docker-email="unused@example.com"
```

1) Create/update secrets (do **not** commit real values):

- Edit `overlays/k3s-dev/secrets.env` locally (ignored by git via `.gitignore`), then:

```bash
kubectl create namespace erpq
kubectl -n erpq create secret generic erpq-app-secrets --from-env-file=overlays/k3s-dev/secrets.env --dry-run=client -o yaml | kubectl apply -f -
```

2) Deploy:

```bash
kubectl apply -k overlays/k3s-dev
# or, with GHCR pull secret wired into the ServiceAccount:
# kubectl apply -k overlays/k3s-dev-ghcr
```

3) Verify:

```bash
kubectl -n erpq get pods
kubectl -n erpq get ingress
```

