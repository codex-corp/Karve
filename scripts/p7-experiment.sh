#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || {
  printf 'ERROR: .env is missing. Run: bash scripts/bootstrap.sh\n' >&2
  exit 1
}

# shellcheck disable=SC1091
set -a
. ./.env
set +a

docker compose run --rm karve "$@"
