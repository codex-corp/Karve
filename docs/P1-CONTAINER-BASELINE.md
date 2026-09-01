# P1 — WSL + Container Baseline

## Status

**PASS — verified on the real WSL/Docker host on 2026-09-01**

P1 is closed. P2 is the active phase.

## Goal

Create one disposable, reproducible project environment inside WSL while keeping the Windows host clean and all important Karve data persistent outside containers.

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container
```

Windows does not need global Node, Python, FFmpeg, Chromium, Whisper, Remotion, or Docker Desktop installations for Karve.

## Baseline installed inside the image

- Node.js 22
- pnpm 10
- Python 3
- uv
- FFmpeg / ffprobe
- Chromium
- Git / OpenSSH client / curl / jq / diagnostics
- Noto Arabic-capable fonts
- tini

Later-phase dependencies remain deferred to their owning phases.

## Persistent state

```text
/home/hany/karve-data/
├── projects/
├── cache/
│   ├── huggingface/
│   ├── uv/
│   └── xdg/
├── models/
├── assets/
├── generated-components/
└── state/
```

The root is bind-mounted inside the container at `/karve-data`. The repository is mounted at `/workspace/karve`.

## Verified host results

The real WSL/Docker bootstrap completed successfully with:

```text
Node:        v22.23.2
pnpm:        10.34.5
Python:      3.11.2
uv:          0.12.8
Git:         2.39.5
FFmpeg:      5.1.9-0+deb12u1
ffprobe:     5.1.9-0+deb12u1
Chromium:    151.0.7922.173
jq:          1.6
UID/GID:     1000:1000
Arabic font: Noto Sans Arabic
Data root:   /home/hany/karve-data
```

Verified conditions:

- `/karve-data` is writable;
- all expected persistent directories are visible;
- the persistence sentinel is visible from a fresh container;
- the repository bind mount is writable;
- Arabic font resolution succeeds.

## Persistence gate result

The full persistence test was run after bootstrap:

```text
docker compose down
-> rebuild image
-> start fresh container
-> verify same sentinel
-> rerun doctor
```

Result:

```text
P1 doctor: PASS
P1 persistence verification: PASS
```

This proves Karve's important state lives outside disposable containers/images.

## Line-ending note

The existing WSL checkout initially presented `scripts/p1-verify-persistence.sh` with CRLF line endings, causing Bash to fail on the first persistence run. The local file was normalized to LF and the rerun passed.

The upstream Git blob is LF and `.gitattributes` enforces `eol=lf` for shell/runtime configuration files, so this is treated as a local checkout normalization issue rather than a P1 architecture failure.

## P1 gate

**PASS.** Both required commands succeeded on the actual target environment:

```bash
bash scripts/bootstrap.sh
bash scripts/p1-verify-persistence.sh
```

## Intentional P1 boundaries

P1 did not add Whisper, Bifrost, automatic cutting, Remotion compositions, Codex motion generation, GPU-only requirements, databases, or queues. Those remain owned by later phases.
