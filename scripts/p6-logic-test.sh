#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[ -f .env ] || {
  printf 'ERROR: .env is missing. Run: bash scripts/bootstrap.sh\n' >&2
  exit 1
}

printf '==> Type-checking P6 orchestration and Remotion components\n'
docker compose run --rm karve tsc --noEmit

printf '==> Running P6 timeline/presentation regression tests\n'
docker compose run --rm karve \
  node --experimental-strip-types src/p6/presentation.test.ts

printf '==> Running P6 caption correction alignment tests\n'
docker compose run --rm karve \
  node --experimental-strip-types src/p6/align.test.ts

printf '==> Running P6-B.2 correction/provenance integration tests\n'
docker compose run --rm karve \
  node --experimental-strip-types src/p6/correction-integration.test.ts
