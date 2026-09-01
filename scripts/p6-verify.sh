#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf 'Usage: bash scripts/p6-verify.sh <project-id> [source|reel|youtube]\n' >&2
  exit 2
fi

[ -f .env ] || fail ".env is missing. Run: bash scripts/bootstrap.sh"
PROJECT="$1"
PROFILE="${2:-source}"
[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "Invalid project id: $PROJECT"
case "$PROFILE" in
  source|reel|youtube) ;;
  *) fail "Unsupported P6 profile: $PROFILE" ;;
esac

printf '==> Verifying P6 project: %s (%s)\n' "$PROJECT" "$PROFILE"
docker compose run --rm karve \
  node --experimental-strip-types src/p6/verify.ts "$PROJECT" "$PROFILE"
