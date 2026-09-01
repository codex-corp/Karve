#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"
# shellcheck disable=SC1091
set -a
. ./.env
set +a

MODEL_ROOT="$KARVE_DATA_ROOT/models/whisper"
[ -d "$MODEL_ROOT" ] || fail "Whisper model cache does not exist yet: $MODEL_ROOT"

cache_bytes() {
  docker compose run --rm karve bash -c \
    "find /karve-data/models/whisper -type f -exec stat -c %s {} + | awk '{s+=\$1} END {print s+0}'"
}

printf '==> Measuring persistent model cache inside the Karve container\n'
before="$(cache_bytes)"
[ "$before" -gt 0 ] || fail "Whisper model cache is empty"

printf '==> Removing disposable Karve containers\n'
docker compose down --remove-orphans

printf '==> Verifying model cache from a fresh container\n'
after="$(cache_bytes)"

[ "$before" = "$after" ] || fail "Model cache size changed across container recreation ($before -> $after)"

printf '\nP3 model cache persistence: PASS\n'
printf 'Persistent bytes: %s\n' "$before"
