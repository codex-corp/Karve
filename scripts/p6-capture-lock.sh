#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"
if [ -e package-lock.json ] && [ "${1:-}" != "--force" ]; then
  fail "package-lock.json already exists (use --force to replace it from the current image)"
fi

printf '==> Capturing the resolved P6 dependency lockfile from the built image\n'
docker compose run --rm karve bash -c \
  'test -f /workspace/package-lock.json && cp /workspace/package-lock.json /workspace/karve/package-lock.json'

# Keep validation inside the project container; Node is intentionally not a
# WSL host prerequisite.
docker compose run --rm karve node -e '
  const lock = require("/workspace/karve/package-lock.json");
  if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 2) {
    throw new Error("Unsupported package-lock.json format");
  }
  console.log(`Resolved package lock captured (lockfileVersion ${lock.lockfileVersion}).`);
'

printf 'Review package-lock.json before committing it.\n'
