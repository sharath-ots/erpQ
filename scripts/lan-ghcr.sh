#!/usr/bin/env sh
# Mode B-alt — LAN VM pull from GHCR (NO local build). Images come from CI after push to main.
# See docs/DEPLOY.md. For code changes on your PC use scripts/lan-deploy.ps1 instead.
#
# Run on the LAN VM from repo root:
#   chmod +x scripts/lan-ghcr.sh
#   ./scripts/lan-ghcr.sh pull
#   ./scripts/lan-ghcr.sh up -d
#
# Env file defaults to .env.lan; override with ENV_FILE=/path/to/.env.lan

set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.lan}"

docker compose \
  -f docker-compose.production.yml \
  -f docker-compose.traefik.yml \
  --env-file "$ENV_FILE" \
  "$@"
