#!/usr/bin/env sh
# Run from repo root on the LAN VM: pull GHCR images + Traefik path routing.
# Usage:
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
