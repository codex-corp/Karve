#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || {
  printf 'ERROR: .env is missing. Run: bash scripts/bootstrap.sh\n' >&2
  exit 1
}

printf '==> Type-checking repository TypeScript modules (src/**/*.ts, remotion/**/*.ts*)\n'
docker compose run --rm karve npm run typecheck

printf '==> Running P7 Visual Mission and Visual Plan contract tests\n'
docker compose run --rm karve npm run test:p7-contract
