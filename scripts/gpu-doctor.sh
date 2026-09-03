#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '\n==> %s\n' "$*"
}

command -v docker >/dev/null 2>&1 || fail "Docker is unavailable inside WSL"
docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable"
docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable"
[ -f .env ] || fail ".env is missing; run: bash scripts/bootstrap.sh"
uname -r | grep -qi microsoft || fail "GPU validation currently supports the accepted WSL2 runtime only"

[ -c /dev/dxg ] || fail "/dev/dxg is missing; update/restart WSL before enabling GPU acceleration"
if [ ! -c /dev/dri/card0 ] || [ ! -c /dev/dri/renderD128 ]; then
  fail "/dev/dri DRM nodes are missing. Run 'sudo modprobe vgem', verify card0/renderD128 are character devices, then retry."
fi

VIDEO_GID="$(stat -c '%g' /dev/dri/card0)"
RENDER_GID="$(stat -c '%g' /dev/dri/renderD128)"
GPU_ADAPTER="${KARVE_GPU_ADAPTER_NAME:-Arc}"

info "Validating GPU Compose overlay"
KARVE_VIDEO_GID="$VIDEO_GID" \
KARVE_RENDER_GID="$RENDER_GID" \
KARVE_GPU_ADAPTER_NAME="$GPU_ADAPTER" \
  docker compose -f docker-compose.yml -f docker-compose.gpu.yml config >/dev/null

info "Checking Intel Arc VA-API path inside the Karve container"
KARVE_VIDEO_GID="$VIDEO_GID" \
KARVE_RENDER_GID="$RENDER_GID" \
KARVE_GPU_ADAPTER_NAME="$GPU_ADAPTER" \
  docker compose -f docker-compose.yml -f docker-compose.gpu.yml run --rm karve \
  bash -lc '
    set -euo pipefail
    test -c /dev/dxg
    test -c /dev/dri/card0
    test -c /dev/dri/renderD128
    test -d /usr/lib/wsl/lib
    test -r /usr/lib/x86_64-linux-gnu/dri/d3d12_drv_video.so

    printf "==> vainfo\n"
    vainfo --display drm --device /dev/dri/card0

    printf "\n==> FFmpeg VA-API encoders\n"
    ffmpeg -hide_banner -encoders | grep -E "av1_vaapi|h264_vaapi|hevc_vaapi" || true
    ffmpeg -hide_banner -encoders | grep -F "av1_vaapi" >/dev/null \
      || { printf "AV1 VA-API encoder is unavailable\n" >&2; exit 1; }

    printf "\n==> Synthetic Arc AV1 encode\n"
    ffmpeg -hide_banner -loglevel error \
      -vaapi_device /dev/dri/card0 \
      -f lavfi \
      -i testsrc2=size=1280x720:rate=30 \
      -vf "format=nv12,hwupload" \
      -c:v av1_vaapi \
      -b:v 4M \
      -t 5 \
      -y /tmp/karve-gpu-doctor-av1.mkv

    ffprobe -v error \
      -select_streams v:0 \
      -show_entries stream=codec_name,width,height \
      -of default=noprint_wrappers=1 \
      /tmp/karve-gpu-doctor-av1.mkv
  '

printf '\nKarve GPU doctor: PASS (AV1 VA-API encode)\n'
printf 'Adapter selector: %s\n' "$GPU_ADAPTER"
