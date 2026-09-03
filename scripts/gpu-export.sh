#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/gpu-export.sh <input-video> <output-video> [--bitrate <rate>] [--force]

Examples:
  bash scripts/gpu-export.sh \
    ~/karve-data/projects/sample-3-large/p6-source.mp4 \
    ~/karve-data/projects/sample-3-large/p6-source.av1.mkv

  bash scripts/gpu-export.sh input.mp4 output.av1.mkv --bitrate 8M --force

Current validated GPU path:
  CPU decode -> NV12 upload -> Intel Arc AV1 VA-API encode

This produces a derivative export. It does not replace canonical P5/P6 artifacts.
USAGE
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi
[ "$#" -ge 2 ] || { usage >&2; exit 2; }
INPUT="$1"
OUTPUT="$2"
shift 2

BITRATE="6M"
FORCE=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --bitrate)
      [ "$#" -ge 2 ] || fail "--bitrate requires a value"
      BITRATE="$2"
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
[ -c /dev/dxg ] || fail "/dev/dxg is missing"
[ -c /dev/dri/card0 ] || fail "/dev/dri/card0 is missing; run 'sudo modprobe vgem' and retry"
[ -c /dev/dri/renderD128 ] || fail "/dev/dri/renderD128 is missing; run 'sudo modprobe vgem' and retry"

[ -f "$INPUT" ] || fail "Input video does not exist: $INPUT"
[ -r "$INPUT" ] || fail "Input video is not readable: $INPUT"
INPUT="$(realpath "$INPUT")"

OUTPUT_DIR="$(dirname "$OUTPUT")"
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(realpath "$OUTPUT_DIR")"
OUTPUT_NAME="$(basename "$OUTPUT")"
OUTPUT="$OUTPUT_DIR/$OUTPUT_NAME"

[ "$INPUT" != "$OUTPUT" ] || fail "Input and output must be different files"

if [ -e "$OUTPUT" ] && [ "$FORCE" -ne 1 ]; then
  fail "Output already exists: $OUTPUT (use --force to replace it)"
fi

VIDEO_GID="$(stat -c '%g' /dev/dri/card0)"
RENDER_GID="$(stat -c '%g' /dev/dri/renderD128)"
GPU_ADAPTER="${KARVE_GPU_ADAPTER_NAME:-Arc}"

FFMPEG_OVERWRITE="-n"
if [ "$FORCE" -eq 1 ]; then
  FFMPEG_OVERWRITE="-y"
fi

printf '==> GPU exporting with av1_vaapi (%s)\n' "$BITRATE"
printf 'Input:  %s\n' "$INPUT"
printf 'Output: %s\n' "$OUTPUT"

KARVE_VIDEO_GID="$VIDEO_GID" \
KARVE_RENDER_GID="$RENDER_GID" \
KARVE_GPU_ADAPTER_NAME="$GPU_ADAPTER" \
  docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm \
  -v "$INPUT:/tmp/karve-gpu-input:ro" \
  -v "$OUTPUT_DIR:/tmp/karve-gpu-output" \
  karve ffmpeg -hide_banner \
    -vaapi_device /dev/dri/card0 \
    -i /tmp/karve-gpu-input \
    -map 0:v:0 \
    -map '0:a?' \
    -vf 'format=nv12,hwupload' \
    -c:v av1_vaapi \
    -b:v "$BITRATE" \
    -c:a copy \
    "$FFMPEG_OVERWRITE" \
    "/tmp/karve-gpu-output/$OUTPUT_NAME"

printf 'GPU export complete: %s\n' "$OUTPUT"
