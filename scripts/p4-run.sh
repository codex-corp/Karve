#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if [ "$#" -lt 1 ]; then
  cat >&2 <<'USAGE'
Usage: bash scripts/p4-run.sh <project-id> [planner options]

Examples:
  bash scripts/p4-run.sh sample-3-large
  bash scripts/p4-run.sh sample-3-large --profile fast
  bash scripts/p4-run.sh sample-3-large --structured-mode json_object --force
USAGE
  exit 2
fi

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"

PROJECT="$1"
shift

[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "Invalid project id: $PROJECT"

# shellcheck disable=SC1091
set -a
. ./.env
set +a

PROJECT_ROOT="$KARVE_DATA_ROOT/projects/$PROJECT"
[ -f "$PROJECT_ROOT/source.json" ] || fail "Missing source.json for project: $PROJECT"
[ -f "$PROJECT_ROOT/transcript.json" ] || fail "Missing transcript.json for project: $PROJECT"

printf '==> Starting P4 structured edit planning for project: %s\n' "$PROJECT"
docker compose -f docker-compose.yml -f docker-compose.p4.yml run --rm karve \
  node --experimental-strip-types src/p4/plan.ts \
  --project "$PROJECT" \
  "$@"
