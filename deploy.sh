#!/usr/bin/env bash
set -euo pipefail

# Deploy pre-built GHCR images with the HTTPS edge by default.
# Override COMPOSE_FILES if you need a different compose stack.
COMPOSE_FILES="${COMPOSE_FILES:-docker-compose.production.yml docker-compose.traefik.yml}"
# Production: use .env.production (see .env.production.example). Override with ENV_FILE= if needed.
ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-erpq}"
SERVICES="${SERVICES:-}"

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not available on PATH." >&2
  exit 1
fi

COMPOSE_ARGS=()
for compose_file in $COMPOSE_FILES; do
  if [ ! -f "$compose_file" ]; then
    echo "Compose file not found: $compose_file" >&2
    exit 1
  fi
  COMPOSE_ARGS+=("-f" "$compose_file")
done

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
GHCR_LOGIN_USER_VALUE="$(get_env_value GHCR_LOGIN_USER)"
GHCR_TOKEN_VALUE="$(get_env_value GHCR_TOKEN)"
if [ -z "$GHCR_TOKEN_VALUE" ]; then
  GHCR_TOKEN_VALUE="$(get_env_value GHCR_PAT)"
fi

if [ -z "$GHCR_OWNER_VALUE" ]; then
  echo "GHCR_OWNER must be set in the environment or $ENV_FILE." >&2
  exit 1
fi

if [ -z "$GHCR_LOGIN_USER_VALUE" ]; then
  GHCR_LOGIN_USER_VALUE="$GHCR_OWNER_VALUE"
fi

if [ -z "$APP_VERSION_VALUE" ]; then
  echo "APP_VERSION is not set; docker compose will use the compose default tag." >&2
fi

export ENV_FILE

echo "Deploying GHCR images"
echo "  project:      $PROJECT_NAME"
echo "  compose files:$COMPOSE_FILES"
echo "  env file:     $ENV_FILE"
echo "  owner:        $GHCR_OWNER_VALUE"
echo "  version:      ${APP_VERSION_VALUE:-compose default}"

if [ -n "$GHCR_TOKEN_VALUE" ]; then
  echo "Logging in to ghcr.io as $GHCR_LOGIN_USER_VALUE"
  printf '%s' "$GHCR_TOKEN_VALUE" | docker login ghcr.io -u "$GHCR_LOGIN_USER_VALUE" --password-stdin >/dev/null
else
  echo "No GHCR_TOKEN/GHCR_PAT provided; assuming this Docker host is already logged in to ghcr.io."
fi

docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" config >/dev/null

if [ -n "$SERVICES" ]; then
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" pull $SERVICES
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" up -d --remove-orphans $SERVICES
else
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" pull
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" up -d --remove-orphans
fi

docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" ps

echo "Deployment complete."