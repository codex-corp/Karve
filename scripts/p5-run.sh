#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/p5-run.sh <project-id> <source-video> [--plan-only] [--force]

Examples:
  bash scripts/p5-run.sh real-p2 videos/test-video.mp4 --plan-only
  bash scripts/p5-run.sh real-p2 videos/test-video.mp4 --force
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$#" -ge 2 ] || { usage >&2; exit 2; }
PROJECT="$1"
INPUT="$2"
shift 2

[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "Invalid project id: $PROJECT"
command -v docker >/dev/null 2>&1 || fail "Docker is unavailable inside WSL"
docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable"
[ -f .env ] || fail ".env is missing; run: bash scripts/bootstrap.sh"

# shellcheck disable=SC1091
set -a
. ./.env
set +a

PROJECT_ROOT="$KARVE_DATA_ROOT/projects/$PROJECT"
for required in source.json transcript.json edit-plan.json audio.wav; do
  [ -f "$PROJECT_ROOT/$required" ] || fail "Missing $required for project: $PROJECT"
done

INPUT="$(realpath "$INPUT")"
[ -f "$INPUT" ] || fail "Source video does not exist: $INPUT"
[ -r "$INPUT" ] || fail "Source video is not readable: $INPUT"

case "$INPUT" in
  /mnt/*)
    printf 'WARNING: source is under /mnt/*; rendering will work, but WSL Linux storage is faster.\n' >&2
    ;;
esac

printf '==> Starting P5 rough cut for project: %s\n' "$PROJECT"
docker compose run --rm \
  -v "$INPUT:/tmp/karve-source:ro" \
  karve node --experimental-strip-types src/p5/rough-cut.ts \
  --project "$PROJECT" \
  --input /tmp/karve-source \
  "$@"
