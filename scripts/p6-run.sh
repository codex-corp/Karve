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
Usage: bash scripts/p6-run.sh <project-id> [render options]

Options are forwarded to the P6 renderer:
  --profile source|reel|youtube
  --style <style-id>
  --plan-only
  --concurrency <n>
  --force

Examples:
  bash scripts/p6-run.sh sample-3-large --profile source --plan-only
  bash scripts/p6-run.sh sample-3-large --profile source --force
  bash scripts/p6-run.sh sample-3-large --profile reel --force
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
for artifact in source.json transcript.json rough-cut-plan.json timeline-map.json rough-cut.mp4; do
  [ -f "$PROJECT_ROOT/$artifact" ] || fail "Missing $artifact for project: $PROJECT"
done

COMPOSE_ARGS=(-f docker-compose.yml)
if [ -c /dev/dxg ] && [ -c /dev/dri/card0 ] && [ -f docker-compose.gpu.yml ]; then
  export KARVE_VIDEO_GID="$(stat -c '%g' /dev/dri/card0 2>/dev/null || echo 44)"
  export KARVE_RENDER_GID="$(stat -c '%g' /dev/dri/renderD128 2>/dev/null || echo 106)"
  COMPOSE_ARGS+=(-f docker-compose.gpu.yml)
fi

printf '==> Starting P6 captions and motion for project: %s\n' "$PROJECT"
docker compose "${COMPOSE_ARGS[@]}" run --rm karve \
  node --experimental-strip-types src/p6/render.ts \
  --project "$PROJECT" \
  "$@"
