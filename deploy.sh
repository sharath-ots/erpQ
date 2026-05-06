#!/usr/bin/env bash
set -euo pipefail

# Deploy pre-built GHCR images. This intentionally does not include Traefik;
# add docker-compose.traefik.yml later only after it has been tested locally.
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
# Production: use .env.production (see .env.production.example). Override with ENV_FILE= if needed.
ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-erpq}"
SERVICES="${SERVICES:-}"

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not available on PATH." >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  echo "Create it: cp .env.production.example .env.production  (set GHCR_OWNER, APP_VERSION, secrets)." >&2
  exit 1
fi

get_env_value() {
  local key="$1"
  local value="${!key:-}"
  if [ -z "$value" ]; then
    value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  fi
  printf '%s' "$value"
}

GHCR_OWNER_VALUE="$(get_env_value GHCR_OWNER)"
APP_VERSION_VALUE="$(get_env_value APP_VERSION)"

if [ -z "$GHCR_OWNER_VALUE" ]; then
  echo "GHCR_OWNER must be set in the environment or $ENV_FILE." >&2
  exit 1
fi

if [ -z "$APP_VERSION_VALUE" ]; then
  echo "APP_VERSION is not set; docker compose will use the compose default tag." >&2
fi

export ENV_FILE

echo "Deploying GHCR images"
echo "  project:      $PROJECT_NAME"
echo "  compose file: $COMPOSE_FILE"
echo "  env file:     $ENV_FILE"
echo "  owner:        $GHCR_OWNER_VALUE"
echo "  version:      ${APP_VERSION_VALUE:-compose default}"

docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

if [ -n "$SERVICES" ]; then
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull $SERVICES
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans $SERVICES
else
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans
fi

docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Deployment complete."