#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if [ "$#" -ne 1 ]; then
  printf 'Usage: bash scripts/p4-verify.sh <project-id>\n' >&2
  exit 2
fi

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"

PROJECT="$1"
[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "Invalid project id: $PROJECT"

# shellcheck disable=SC1091
set -a
. ./.env
set +a

PROJECT_ROOT="$KARVE_DATA_ROOT/projects/$PROJECT"
[ -f "$PROJECT_ROOT/edit-plan.json" ] || fail "Missing edit-plan.json for project: $PROJECT"

printf '==> Validating P4 edit-plan schema and semantic invariants\n'
docker compose run --rm karve \
  node --experimental-strip-types src/p4/verify.ts --project "$PROJECT"
