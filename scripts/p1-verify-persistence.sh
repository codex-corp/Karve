#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  printf 'ERROR: .env is missing. Run: bash scripts/bootstrap.sh\n' >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. ./.env
set +a

SENTINEL="$KARVE_DATA_ROOT/state/p1-persistence-sentinel.txt"
[ -f "$SENTINEL" ] || {
  printf 'ERROR: persistence sentinel is missing: %s\n' "$SENTINEL" >&2
  exit 1
}

before="$(cat "$SENTINEL")"

printf '==> Removing disposable container state\n'
docker compose down --remove-orphans

printf '==> Rebuilding image\n'
docker compose build

printf '==> Verifying persistent sentinel through a fresh container\n'
after="$(docker compose run --rm karve cat /karve-data/state/p1-persistence-sentinel.txt)"

if [ "$before" != "$after" ]; then
  printf 'ERROR: persistence sentinel changed or disappeared.\n' >&2
  exit 1
fi

printf '==> Re-running doctor on fresh container\n'
docker compose run --rm karve bash scripts/doctor.sh

printf '\nP1 persistence verification: PASS\n'
