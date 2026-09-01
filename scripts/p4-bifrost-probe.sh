#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"

printf '==> Testing Karve -> local Bifrost through the P4 host-network boundary\n'
docker compose -f docker-compose.yml -f docker-compose.p4.yml run --rm karve \
  node --experimental-strip-types src/p4/probe.ts
