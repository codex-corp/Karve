#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

for cmd in ffmpeg ffprobe jq; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command is unavailable: $cmd"
done

DATA_ROOT="${KARVE_DATA_ROOT:-/karve-data}"
[ -d "$DATA_ROOT" ] || fail "Karve data root does not exist: $DATA_ROOT"
[ -w "$DATA_ROOT" ] || fail "Karve data root is not writable: $DATA_ROOT"
mkdir -p "$DATA_ROOT/state" "$DATA_ROOT/projects"

FIXTURE="$DATA_ROOT/state/p2-smoke-source.mp4"
PROJECT="p2-smoke"
PROJECT_DIR="$DATA_ROOT/projects/$PROJECT"

printf '==> Generating synthetic A/V fixture\n'
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30" \
  -f lavfi -i "sine=frequency=880:sample_rate=48000" \
  -t 6 \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -shortest \
  "$FIXTURE"

printf '==> Running P2 ingest against fixture\n'
bash scripts/p2-ingest.sh \
  --input "$FIXTURE" \
  --source-name "p2-smoke-source.mp4" \
  --project "$PROJECT" \
  --force

for artifact in source.json audio.wav media-test.mp4; do
  [ -s "$PROJECT_DIR/$artifact" ] || fail "Missing or empty artifact: $PROJECT_DIR/$artifact"
done

printf '==> Checking normalized metadata\n'
jq -e '.schema_version == 1' "$PROJECT_DIR/source.json" >/dev/null || fail "Unexpected source.json schema version"
jq -e '.video.width == 640 and .video.height == 360' "$PROJECT_DIR/source.json" >/dev/null || fail "Unexpected source video dimensions"
jq -e '.audio.sample_rate == 48000' "$PROJECT_DIR/source.json" >/dev/null || fail "Unexpected source audio sample rate"
jq -e '.normalized_audio.sample_rate == 16000 and .normalized_audio.channels == 1' "$PROJECT_DIR/source.json" >/dev/null || fail "Unexpected normalized audio contract"

rate="$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=nw=1:nk=1 "$PROJECT_DIR/audio.wav")"
channels="$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=nw=1:nk=1 "$PROJECT_DIR/audio.wav")"
[ "$rate" = "16000" ] || fail "audio.wav sample rate mismatch: $rate"
[ "$channels" = "1" ] || fail "audio.wav channel mismatch: $channels"

sample_duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$PROJECT_DIR/media-test.mp4")"
awk -v d="$sample_duration" 'BEGIN { exit !(d > 0 && d <= 5.2) }' || fail "media-test.mp4 duration is outside expected range: $sample_duration"

printf '\nP2 media ingest verification: PASS\n'
printf 'Fixture: %s\n' "$FIXTURE"
printf 'Project: %s\n' "$PROJECT_DIR"
