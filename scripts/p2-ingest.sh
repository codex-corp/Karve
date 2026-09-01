#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/p2-ingest.sh --input <path> [--project <id>] [--source-name <name>] [--force]

Runs inside the Karve container. Produces a deterministic P2 media baseline:
  <data-root>/projects/<project>/source.json
  <data-root>/projects/<project>/audio.wav
  <data-root>/projects/<project>/media-test.mp4
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is unavailable: $1"
}

INPUT=""
PROJECT=""
SOURCE_NAME=""
FORCE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --input)
      [ "$#" -ge 2 ] || fail "--input requires a path"
      INPUT="$2"
      shift 2
      ;;
    --project)
      [ "$#" -ge 2 ] || fail "--project requires an id"
      PROJECT="$2"
      shift 2
      ;;
    --source-name)
      [ "$#" -ge 2 ] || fail "--source-name requires a name"
      SOURCE_NAME="$2"
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

[ -n "$INPUT" ] || { usage >&2; fail "--input is required"; }
[ -f "$INPUT" ] || fail "Input file does not exist: $INPUT"
[ -r "$INPUT" ] || fail "Input file is not readable: $INPUT"

for cmd in ffmpeg ffprobe jq stat; do
  require_cmd "$cmd"
done

DATA_ROOT="${KARVE_DATA_ROOT:-/karve-data}"
[ -d "$DATA_ROOT" ] || fail "Karve data root does not exist: $DATA_ROOT"
[ -w "$DATA_ROOT" ] || fail "Karve data root is not writable: $DATA_ROOT"
mkdir -p "$DATA_ROOT/projects" "$DATA_ROOT/state"

if [ -z "$SOURCE_NAME" ]; then
  SOURCE_NAME="$(basename "$INPUT")"
fi

if [ -z "$PROJECT" ]; then
  stem="${SOURCE_NAME%.*}"
  PROJECT="$(printf '%s' "$stem" | tr '[:space:]' '-' | tr -cd '[:alnum:]_.-' | sed -E 's/-+/-/g; s/^[.-]+//; s/[.-]+$//')"
  [ -n "$PROJECT" ] || PROJECT="media"
  PROJECT="${PROJECT}-$(date +%Y%m%d-%H%M%S)"
fi

if ! printf '%s' "$PROJECT" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$'; then
  fail "Project id must contain only letters, numbers, dot, underscore, and dash: $PROJECT"
fi

PROJECT_DIR="$DATA_ROOT/projects/$PROJECT"
if [ -e "$PROJECT_DIR" ]; then
  [ "$FORCE" -eq 1 ] || fail "Project already exists: $PROJECT_DIR (use --force to replace P2 artifacts)"
  rm -rf "$PROJECT_DIR"
fi

TMP_DIR="$(mktemp -d "$DATA_ROOT/state/p2-ingest.XXXXXX")"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

printf '==> Probing source media\n'
ffprobe -v error -show_format -show_streams -print_format json "$INPUT" > "$TMP_DIR/probe.json"

video_count="$(jq '[.streams[] | select(.codec_type == "video")] | length' "$TMP_DIR/probe.json")"
audio_count="$(jq '[.streams[] | select(.codec_type == "audio")] | length' "$TMP_DIR/probe.json")"
[ "$video_count" -gt 0 ] || fail "Input contains no video stream"
[ "$audio_count" -gt 0 ] || fail "Input contains no audio stream; P2 currently requires talking-head/video-with-audio media"

duration="$(jq -r '(.format.duration // ([.streams[] | select(.codec_type == "video")][0].duration) // ([.streams[] | select(.codec_type == "audio")][0].duration) // empty)' "$TMP_DIR/probe.json")"
[ -n "$duration" ] || duration="0"
awk -v d="$duration" 'BEGIN { exit !(d > 0) }' || fail "Input duration is missing or invalid"

source_size="$(stat -c '%s' "$INPUT")"

jq \
  --arg schema_version "1" \
  --arg project_id "$PROJECT" \
  --arg source_name "$SOURCE_NAME" \
  --arg source_size "$source_size" \
  --arg duration "$duration" \
  '
  def first_stream($kind): [.streams[] | select(.codec_type == $kind)][0];
  (first_stream("video")) as $v |
  (first_stream("audio")) as $a |
  {
    schema_version: ($schema_version | tonumber),
    project_id: $project_id,
    source: {
      file_name: $source_name,
      size_bytes: ($source_size | tonumber),
      format_name: .format.format_name,
      format_long_name: .format.format_long_name,
      duration_seconds: ($duration | tonumber),
      bit_rate: ((.format.bit_rate // "0") | tonumber)
    },
    video: {
      codec: $v.codec_name,
      profile: $v.profile,
      width: $v.width,
      height: $v.height,
      pixel_format: $v.pix_fmt,
      avg_frame_rate: $v.avg_frame_rate,
      r_frame_rate: $v.r_frame_rate,
      time_base: $v.time_base,
      rotation: (($v.side_data_list // [] | map(select(has("rotation"))) | .[0].rotation) // 0)
    },
    audio: {
      codec: $a.codec_name,
      sample_rate: (($a.sample_rate // "0") | tonumber),
      channels: $a.channels,
      channel_layout: ($a.channel_layout // null),
      time_base: $a.time_base
    },
    normalized_audio: {
      codec: "pcm_s16le",
      sample_rate: 16000,
      channels: 1
    },
    artifacts: {
      audio: "audio.wav",
      media_test: "media-test.mp4"
    }
  }
  ' "$TMP_DIR/probe.json" > "$TMP_DIR/source.json"

printf '==> Extracting normalized transcription audio (16 kHz mono PCM)\n'
ffmpeg -hide_banner -loglevel error -y \
  -i "$INPUT" \
  -map 0:a:0 -vn \
  -ac 1 -ar 16000 -c:a pcm_s16le \
  "$TMP_DIR/audio.wav"

printf '==> Rendering deterministic short media sample\n'
ffmpeg -hide_banner -loglevel error -y \
  -i "$INPUT" \
  -map 0:v:0 -map 0:a:0 \
  -t 5 \
  -vf "scale='trunc(min(1280,iw)/2)*2':-2" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$TMP_DIR/media-test.mp4"

printf '==> Validating generated artifacts\n'
normalized_rate="$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=nw=1:nk=1 "$TMP_DIR/audio.wav")"
normalized_channels="$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=nw=1:nk=1 "$TMP_DIR/audio.wav")"
[ "$normalized_rate" = "16000" ] || fail "Normalized audio sample rate is $normalized_rate, expected 16000"
[ "$normalized_channels" = "1" ] || fail "Normalized audio channel count is $normalized_channels, expected 1"

sample_video_count="$(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$TMP_DIR/media-test.mp4" | grep -c '^video$' || true)"
sample_audio_count="$(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$TMP_DIR/media-test.mp4" | grep -c '^audio$' || true)"
[ "$sample_video_count" -gt 0 ] || fail "media-test.mp4 has no video stream"
[ "$sample_audio_count" -gt 0 ] || fail "media-test.mp4 has no audio stream"

mkdir -p "$PROJECT_DIR"
mv "$TMP_DIR/source.json" "$PROJECT_DIR/source.json"
mv "$TMP_DIR/audio.wav" "$PROJECT_DIR/audio.wav"
mv "$TMP_DIR/media-test.mp4" "$PROJECT_DIR/media-test.mp4"

printf '\nP2 ingest: PASS\n'
printf 'Project: %s\n' "$PROJECT"
printf 'Output: %s\n' "$PROJECT_DIR"
