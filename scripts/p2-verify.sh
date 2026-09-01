#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is unavailable inside WSL"
docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable"
[ -f .env ] || fail ".env is missing; run: bash scripts/bootstrap.sh"

docker compose run --rm karve bash scripts/p2-smoke-test.sh
