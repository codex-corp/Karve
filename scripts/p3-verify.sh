#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/p3-verify.sh <project-id> [expected-language]

Examples:
  bash scripts/p3-verify.sh real-p2 ar
  bash scripts/p3-verify.sh english-test en
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ "$#" -ge 1 ] || { usage >&2; exit 1; }
PROJECT="$1"
EXPECTED_LANGUAGE="${2:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"
# shellcheck disable=SC1091
set -a
. ./.env
set +a

PROJECT_DIR="$KARVE_DATA_ROOT/projects/$PROJECT"
TRANSCRIPT="$PROJECT_DIR/transcript.json"
AUDIO="$PROJECT_DIR/audio.wav"

[ -f "$TRANSCRIPT" ] || fail "Transcript is missing: $TRANSCRIPT"
[ -f "$AUDIO" ] || fail "P2 audio is missing: $AUDIO"

printf '==> Validating transcript contract\n'
jq -e '
  .schema_version == 1 and
  (.project_id | type == "string" and length > 0) and
  .engine.name == "faster-whisper" and
  .engine.word_timestamps == true and
  (.language.detected | type == "string" and length > 0) and
  (.language.probability >= 0 and .language.probability <= 1) and
  (.metrics.segment_count == (.segments | length)) and
  (.metrics.segment_count > 0) and
  (.metrics.word_count > 0) and
  (.text | type == "string" and length > 0) and
  ([.segments[] | select(.start < 0 or .end < .start)] | length == 0) and
  ([.segments[].words[]? | select(.start < 0 or .end < .start or .probability < 0 or .probability > 1)] | length == 0)
' "$TRANSCRIPT" >/dev/null || fail "transcript.json failed the P3 contract"

if [ -n "$EXPECTED_LANGUAGE" ]; then
  detected="$(jq -r '.language.detected' "$TRANSCRIPT")"
  [ "$detected" = "$EXPECTED_LANGUAGE" ] || fail "Detected language is '$detected', expected '$EXPECTED_LANGUAGE'"
fi

audio_duration="$(jq -r '.source.duration_seconds' "$TRANSCRIPT")"
last_timestamp="$(jq '[.segments[].words[]?.end, .segments[].end] | max // 0' "$TRANSCRIPT")"
awk -v last="$last_timestamp" -v duration="$audio_duration" 'BEGIN { exit !(last <= duration + 1.0) }' \
  || fail "Transcript timestamp $last_timestamp exceeds audio duration $audio_duration"

printf '==> Checking faster-whisper runtime inside the Karve image\n'
docker compose run --rm karve python -c \
  'import importlib.metadata as m; print("faster-whisper", m.version("faster-whisper")); print("ctranslate2", m.version("ctranslate2"))'

printf '\nP3 transcript verification: PASS\n'
printf 'Project: %s\n' "$PROJECT"
printf 'Language: %s\n' "$(jq -r '.language.detected + " (" + (.language.probability|tostring) + ")"' "$TRANSCRIPT")"
printf 'Segments: %s\n' "$(jq -r '.metrics.segment_count' "$TRANSCRIPT")"
printf 'Words: %s\n' "$(jq -r '.metrics.word_count' "$TRANSCRIPT")"
printf 'Realtime factor: %s\n' "$(jq -r '.runtime.realtime_factor' "$TRANSCRIPT")"
