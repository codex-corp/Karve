#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/p3-run.sh <project-id> [faster-whisper options]

Examples:
  bash scripts/p3-run.sh real-p2 --language ar
  bash scripts/p3-run.sh real-p2 --language auto --model turbo --force
  bash scripts/p3-run.sh real-p2 --language ar --model large-v3 --force

The project must already contain P2 artifacts under ~/karve-data/projects/<project-id>/.
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$#" -ge 1 ] || { usage >&2; exit 1; }
PROJECT="$1"
shift

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"
# shellcheck disable=SC1091
set -a
. ./.env
set +a

if ! printf '%s' "$PROJECT" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$'; then
  fail "Invalid project id: $PROJECT"
fi

AUDIO="$KARVE_DATA_ROOT/projects/$PROJECT/audio.wav"
SOURCE_JSON="$KARVE_DATA_ROOT/projects/$PROJECT/source.json"
[ -f "$AUDIO" ] || fail "P2 audio is missing: $AUDIO"
[ -f "$SOURCE_JSON" ] || fail "P2 metadata is missing: $SOURCE_JSON"

printf '==> Starting local P3 transcription for project: %s\n' "$PROJECT"
docker compose run --rm karve \
  python transcription/transcribe.py \
  --project "$PROJECT" \
  "$@"
