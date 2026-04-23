#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./debug-production.sh                 # run legacy debug checks
  ./debug-production.sh debug           # same as above

  ./debug-production.sh push --owner <ghcr-owner> [--prefix <name>] [--tag <tag>] [--bump patch|minor|major|none] [--version-file <path>] [--compose <file>] [--include-upstream]

Push mode:
  - For services with "build:", runs: docker compose build <service>
  - For services with only "image:", runs: docker pull <image>
  - Then tags and pushes to:
      ghcr.io/<owner>/<prefix>-<service>:<tag>
      ghcr.io/<owner>/<prefix>-<service>:latest

Examples:
  ./debug-production.sh push --owner my-org --prefix erpq --tag 1.2.3
  ./debug-production.sh push --owner my-org --bump patch
  ./debug-production.sh push --owner my-org --bump minor
  ./debug-production.sh push --owner my-org --bump major
  ./debug-production.sh push --owner my-org --include-upstream
EOF
}

cmd="${1:-debug}"
if [[ "$cmd" == "-h" || "$cmd" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$cmd" == "push" ]]; then
  shift || true

  owner="${GHCR_OWNER:-}"
  prefix="${GHCR_PREFIX:-erpq}"
  tag="${VERSION:-}"
  compose_file="${COMPOSE_FILE:-./docker-compose.yml}"
  version_file="${VERSION_FILE:-./VERSION}"
  bump="${BUMP:-patch}"
  include_upstream="0"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --owner) owner="${2:-}"; shift 2;;
      --prefix) prefix="${2:-}"; shift 2;;
      --tag) tag="${2:-}"; shift 2;;
      --bump) bump="${2:-}"; shift 2;;
      --version-file) version_file="${2:-}"; shift 2;;
      --compose) compose_file="${2:-}"; shift 2;;
      --include-upstream) include_upstream="1"; shift;;
      *) echo "Unknown arg: $1"; usage; exit 2;;
    esac
  done

  if [[ -z "$owner" ]]; then
    echo "ERROR: GHCR owner not set. Pass --owner or set GHCR_OWNER."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    exit 1
  fi

  echo "Compose file: $compose_file"
  echo "GHCR owner:   $owner"
  echo "Prefix:      $prefix"
  echo "Bump:        $bump"
  echo "Version file:$version_file"
  echo ""
  echo "Note: ensure you're logged in: docker login ghcr.io"
  echo ""

  semver_re='^[0-9]+\.[0-9]+\.[0-9]+$'

  next_version() {
    local current="$1" bump_kind="$2"
    if [[ ! "$current" =~ $semver_re ]]; then
      echo "ERROR: invalid semver in VERSION ('$current'). Expected MAJOR.MINOR.PATCH"
      exit 1
    fi
    local maj min pat
    IFS='.' read -r maj min pat <<<"$current"
    case "$bump_kind" in
      none) ;;
      major) maj=$((maj+1)); min=0; pat=0 ;;
      minor) min=$((min+1)); pat=0 ;;
      patch|*) pat=$((pat+1)) ;;
    esac
    echo "${maj}.${min}.${pat}"
  }

  if [[ -z "$tag" ]]; then
    if [[ -f "$version_file" ]]; then
      current="$(tr -d ' \t\r\n' < "$version_file")"
      [[ -n "$current" ]] || current="0.1.0"
    else
      current="0.1.0"
    fi
    tag="$(next_version "$current" "$bump")"
    printf '%s' "$tag" > "$version_file"
  fi
  echo "Tag:         $tag"
  echo ""

  # Prefer jq; fallback to python if jq isn't present.
  if command -v jq >/dev/null 2>&1; then
    cfg_json="$(docker compose -f "$compose_file" config --format json)"
    mapfile -t services < <(echo "$cfg_json" | jq -r '.services | keys[]')

    for svc in "${services[@]}"; do
      image="$(echo "$cfg_json" | jq -r --arg s "$svc" '.services[$s].image // ""')"
      has_build="$(echo "$cfg_json" | jq -r --arg s "$svc" '(.services[$s].build != null)')"

      if [[ -z "$image" ]]; then
        echo "Skipping $svc (no image)"
        continue
      fi

      if [[ "$include_upstream" != "1" && "$image" != erpq/* ]]; then
        echo "Skipping upstream $svc ($image). Use --include-upstream to mirror to GHCR."
        continue
      fi

      echo ""
      echo "Service: $svc"
      echo "Source:  $image"

      if [[ "$has_build" == "true" ]]; then
        docker compose -f "$compose_file" build "$svc"
      else
        docker pull "$image"
      fi

      target_base="ghcr.io/$owner/$prefix-$svc"
      docker tag "$image" "$target_base:$tag"
      docker tag "$image" "$target_base:latest"
      docker push "$target_base:$tag"
      docker push "$target_base:latest"
      echo "Pushed: $target_base:$tag, $target_base:latest"
    done
  else
    python_bin="python"
    if command -v python3 >/dev/null 2>&1; then python_bin="python3"; fi
    if ! command -v "$python_bin" >/dev/null 2>&1; then
      echo "ERROR: need jq or python/python3 installed to parse docker compose JSON."
      exit 1
    fi

    "$python_bin" - "$compose_file" "$owner" "$prefix" "$tag" "$include_upstream" <<'PY'
import json, subprocess, sys

compose_file, owner, prefix, tag, include_upstream = sys.argv[1:]
include_upstream = include_upstream == "1"

cfg = subprocess.check_output(["docker", "compose", "-f", compose_file, "config", "--format", "json"], text=True)
cfg = json.loads(cfg)
services = sorted((cfg.get("services") or {}).keys())

def is_upstream(image: str) -> bool:
    return not image.startswith("erpq/")

for svc in services:
    svc_obj = cfg["services"][svc]
    image = (svc_obj.get("image") or "").strip()
    has_build = svc_obj.get("build") is not None
    if not image:
        print(f"Skipping {svc} (no image)")
        continue
    if is_upstream(image) and not include_upstream:
        print(f"Skipping upstream {svc} ({image}). Use --include-upstream to mirror to GHCR.")
        continue

    print(f"\nService: {svc}\nSource:  {image}")
    if has_build:
        subprocess.check_call(["docker", "compose", "-f", compose_file, "build", svc])
    else:
        subprocess.check_call(["docker", "pull", image])

    target_base = f"ghcr.io/{owner}/{prefix}-{svc}"
    subprocess.check_call(["docker", "tag", image, f"{target_base}:{tag}"])
    subprocess.check_call(["docker", "tag", image, f"{target_base}:latest"])
    subprocess.check_call(["docker", "push", f"{target_base}:{tag}"])
    subprocess.check_call(["docker", "push", f"{target_base}:latest"])
    print(f"Pushed: {target_base}:{tag}, {target_base}:latest")
PY
  fi

  echo ""
  echo "Done."
  exit 0
fi

# ----------------------------
# Legacy debug checks (default)
# ----------------------------

echo "Production Debugging Script"
echo "==========================="
echo ""

echo "Step 1: Checking Docker status..."
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet docker; then
    echo "Docker is running"
  else
    echo "Docker is not running"
    echo "Run: sudo systemctl start docker"
    exit 1
  fi
else
  if docker info >/dev/null 2>&1; then
    echo "Docker is reachable"
  else
    echo "Docker is not reachable"
    exit 1
  fi
fi

echo ""
echo "Step 2: Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

