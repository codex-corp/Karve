#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "Usage: bash scripts/p5-verify.sh <project-id>"
PROJECT="$1"
[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "Invalid project id: $PROJECT"
[ -f .env ] || fail ".env is missing; run: bash scripts/bootstrap.sh"

# shellcheck disable=SC1091
set -a
. ./.env
set +a

[ -f "$KARVE_DATA_ROOT/projects/$PROJECT/rough-cut.mp4" ] || fail "rough-cut.mp4 is missing for project: $PROJECT"

docker compose run --rm karve \
  node --experimental-strip-types src/p5/verify.ts --project "$PROJECT"
