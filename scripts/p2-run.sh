#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/p2-run.sh <source-video> [--project <id>] [--force]

Runs P2 ingest inside the Karve container while mounting the source video read-only.
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$#" -ge 1 ] || { usage >&2; exit 1; }
INPUT="$1"
shift

PROJECT=""
FORCE=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --project)
      [ "$#" -ge 2 ] || fail "--project requires an id"
      PROJECT="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || fail "Docker is unavailable inside WSL"
docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable"
[ -f .env ] || fail ".env is missing; run: bash scripts/bootstrap.sh"

INPUT="$(realpath "$INPUT")"
[ -f "$INPUT" ] || fail "Source video does not exist: $INPUT"
[ -r "$INPUT" ] || fail "Source video is not readable: $INPUT"

case "$INPUT" in
  /mnt/*)
    printf 'WARNING: source is under /mnt/*; ingest will work, but reading from the Windows filesystem may be slower.\n' >&2
    ;;
esac

args=(bash scripts/p2-ingest.sh --input /tmp/karve-source --source-name "$(basename "$INPUT")")
if [ -n "$PROJECT" ]; then
  args+=(--project "$PROJECT")
fi
if [ "$FORCE" -eq 1 ]; then
  args+=(--force)
fi

docker compose run --rm \
  -v "$INPUT:/tmp/karve-source:ro" \
  karve "${args[@]}"
