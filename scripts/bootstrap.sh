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

command -v docker >/dev/null 2>&1 || fail "Docker is not available inside WSL."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available."
docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable from this WSL distribution."

if ! uname -r | grep -qi microsoft; then
  fail "Karve P1 expects to run from WSL2."
fi

if [ "$(id -u)" = "0" ]; then
  fail "Do not run Karve bootstrap as root/sudo. Run it as your normal WSL user so bind-mounted files keep the correct ownership."
fi

case "$ROOT_DIR" in
  /mnt/*)
    fail "The Karve repository is under $ROOT_DIR. Clone it inside the WSL/Linux filesystem (for example ~/projects/Karve) to avoid slow bind mounts."
    ;;
esac

DATA_ROOT="${KARVE_DATA_ROOT:-$HOME/karve-data}"
case "$DATA_ROOT" in
  /*) ;;
  *) fail "KARVE_DATA_ROOT must be an absolute WSL/Linux path." ;;
esac
case "$DATA_ROOT" in
  /mnt/*)
    fail "KARVE_DATA_ROOT points to $DATA_ROOT. Use the WSL/Linux filesystem (default: ~/karve-data), not /mnt/<drive>."
    ;;
esac

LOCAL_UID="$(id -u)"
LOCAL_GID="$(id -g)"

info "Preparing persistent data root: $DATA_ROOT"
mkdir -p \
  "$DATA_ROOT/projects" \
  "$DATA_ROOT/cache/huggingface" \
  "$DATA_ROOT/cache/uv" \
  "$DATA_ROOT/cache/xdg" \
  "$DATA_ROOT/models" \
  "$DATA_ROOT/assets" \
  "$DATA_ROOT/generated-components" \
  "$DATA_ROOT/state"

# Sentinel proves that state lives outside disposable containers/images.
if [ ! -f "$DATA_ROOT/state/p1-persistence-sentinel.txt" ]; then
  printf 'Karve P1 persistent state created at %s\n' "$(date -Iseconds)" > "$DATA_ROOT/state/p1-persistence-sentinel.txt"
fi

info "Writing local Compose environment"
cat > .env <<EOF_ENV
KARVE_DATA_ROOT=$DATA_ROOT
LOCAL_UID=$LOCAL_UID
LOCAL_GID=$LOCAL_GID
EOF_ENV

info "Validating Compose configuration"
docker compose config >/dev/null

info "Building Karve development/runtime image"
docker compose build

info "Running environment doctor"
docker compose run --rm karve bash scripts/doctor.sh

printf '\nP1 bootstrap completed successfully.\n'
printf 'Persistent data: %s\n' "$DATA_ROOT"
printf 'Next verification: bash scripts/p1-verify-persistence.sh\n'
