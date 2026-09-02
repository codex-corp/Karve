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
Usage: bash scripts/p6-correct.sh <project-id> [options]

Options:
  --model <model>               Override default quality model
  --structured-mode <mode>      json_schema or json_object
  --max-attempts <n>            Default: 2
  --timeout <seconds>           Default: 120
  --force                       Overwrite existing caption-corrections.json

Examples:
  bash scripts/p6-correct.sh sample-3-large
  bash scripts/p6-correct.sh sample-3-large --force
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
[ -f "$PROJECT_ROOT/transcript.json" ] || fail "Missing transcript.json for project: $PROJECT"

printf '==> Starting P6-B caption correction for project: %s\n' "$PROJECT"
docker compose -f docker-compose.yml -f docker-compose.p4.yml run --rm karve \
  node --experimental-strip-types src/p6/correct.ts \
  --project "$PROJECT" \
  "$@"
