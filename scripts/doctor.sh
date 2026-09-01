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

check_package_version() {
  local label="$1"
  local package_name="$2"
  local expected="$3"
  local package_path="/workspace/node_modules/$package_name/package.json"
  local actual

  if [ ! -r "$package_path" ]; then
    bad "$label package metadata missing: $package_path"
    return
  fi
  actual="$(node -p "require('$package_path').version" 2>/dev/null || true)"
  if [ "$actual" = "$expected" ]; then
    ok "$label: $actual"
  else
    bad "$label version mismatch: got ${actual:-unknown}, expected $expected"
  fi
}

printf 'Karve Environment Doctor\n\n'

if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  if [ "${ID:-}" = "ubuntu" ] && [ "${VERSION_ID:-}" = "24.04" ]; then
    ok "runtime OS: ${PRETTY_NAME:-Ubuntu 24.04}"
  else
    bad "runtime OS expected Ubuntu 24.04, got ${PRETTY_NAME:-unknown}"
  fi
else
  bad "runtime OS metadata unavailable: /etc/os-release"
fi

check_cmd "glibc" getconf GNU_LIBC_VERSION
check_cmd "Node" node --version
check_cmd "pnpm" pnpm --version
check_cmd "TypeScript" tsc --version
check_cmd "AJV CLI" ajv help
check_cmd "auto-editor" auto-editor --version
check_cmd "Python" python --version
check_cmd "uv" uv --version
check_cmd "Git" git --version
check_cmd "FFmpeg" ffmpeg -version
check_cmd "ffprobe" ffprobe -version

browser_bin="${CHROME_BIN:-/usr/bin/google-chrome-stable}"
if [ -x "$browser_bin" ]; then
  check_cmd "Browser" "$browser_bin" --version
else
  bad "Browser executable missing or not executable: $browser_bin"
fi

check_cmd "jq" jq --version
check_cmd "fontconfig" fc-match --version
check_cmd "faster-whisper" python -c 'import importlib.metadata as m; print(m.version("faster-whisper"))'
check_cmd "CTranslate2" python -c 'import importlib.metadata as m; print(m.version("ctranslate2"))'
check_cmd "Remotion CLI" "${REMOTION_BIN:-/workspace/node_modules/.bin/remotion}" versions
check_package_version "Remotion" "remotion" "4.0.520"
check_package_version "@remotion/cli" "@remotion/cli" "4.0.520"
check_package_version "@remotion/captions" "@remotion/captions" "4.0.520"
check_package_version "remotion-captions-kit" "remotion-captions-kit" "0.2.0"
check_cmd "P6 module imports" node -e 'Promise.all([import("remotion"), import("remotion-captions-kit")]).then(() => console.log("available"))'

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
  printf 'Karve doctor: PASS\n'
  exit 0
fi

printf 'Karve doctor: FAIL (%d check(s))\n' "$failures" >&2
exit 1
