#!/usr/bin/env bash
set -u

failures=0

ok() {
  printf '✓ %s\n' "$*"
}

bad() {
  printf '✗ %s\n' "$*" >&2
  failures=$((failures + 1))
}

check_cmd() {
  local name="$1"
  shift
  local output

  if output="$("$@" 2>&1)"; then
    output="${output%%$'\n'*}"
    ok "$name: ${output:-available}"
  else
    output="${output%%$'\n'*}"
    bad "$name unavailable${output:+: $output}"
  fi
}

printf 'Karve P1 Doctor\n\n'

check_cmd "Node" node --version
check_cmd "pnpm" pnpm --version
check_cmd "Python" python3 --version
check_cmd "uv" uv --version
check_cmd "Git" git --version
check_cmd "FFmpeg" ffmpeg -version
check_cmd "ffprobe" ffprobe -version
check_cmd "Chromium" chromium --version
check_cmd "jq" jq --version
check_cmd "fontconfig" fc-match --version

if [ "$(id -u)" = "${LOCAL_UID:-$(id -u)}" ] && [ "$(id -g)" = "${LOCAL_GID:-$(id -g)}" ]; then
  ok "container UID/GID: $(id -u):$(id -g)"
else
  bad "container UID/GID $(id -u):$(id -g) does not match expected ${LOCAL_UID:-?}:${LOCAL_GID:-?}"
fi

if [ -d /karve-data ] && [ -w /karve-data ]; then
  ok "/karve-data is mounted and writable"
else
  bad "/karve-data is not mounted or not writable"
fi

for dir in projects cache models assets generated-components state; do
  if [ -d "/karve-data/$dir" ]; then
    ok "persistent directory: /karve-data/$dir"
  else
    bad "persistent directory missing: /karve-data/$dir"
  fi
done

if [ -f /karve-data/state/p1-persistence-sentinel.txt ]; then
  ok "persistent state sentinel is visible inside the container"
else
  bad "persistent state sentinel is missing"
fi

if [ -f /workspace/karve/README.md ] && [ -w /workspace/karve ]; then
  ok "repository bind mount is visible and writable"
else
  bad "repository bind mount is missing or not writable"
fi

font_family="$(fc-match -f '%{family}\n' 'Noto Sans Arabic' 2>/dev/null | head -n 1)"
if printf '%s' "$font_family" | grep -qi 'Noto'; then
  ok "Arabic font: $font_family"
else
  bad "Noto Arabic-capable font not resolved (got: ${font_family:-none})"
fi

printf '\n'
if [ "$failures" -eq 0 ]; then
  printf 'P1 doctor: PASS\n'
  exit 0
fi

printf 'P1 doctor: FAIL (%d check(s))\n' "$failures" >&2
exit 1
