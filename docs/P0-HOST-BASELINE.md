# P0 — Host Baseline

## Status

**PASS — closed 2026-09-01.**

P0 validated the host before Karve installs or runs the actual media/AI stack.

## Intent

Keep Windows clean. P0 should **inspect**, not install, the full runtime.

For the current development machine, the chosen runtime boundary is:

```text
Windows 11
  -> WSL2
     -> Ubuntu
        -> Git
        -> Docker Engine + Compose
        -> Karve repository
```

**Docker is intentionally not required on the Windows host.** Karve's Docker Engine runs inside WSL/Ubuntu. Windows remains only the outer host for WSL.

Everything else belongs in P1 inside the reproducible project environment.

## Host prerequisites

Required on Windows:

- Windows 11
- WSL2
- an Ubuntu WSL distribution

Required inside the WSL workflow:

- Git
- Docker Engine
- Docker Compose
- access to the Karve repository

Not required globally on Windows:

- Docker Desktop
- Git (if Git is available in WSL)
- Node.js
- pnpm
- Python
- uv
- FFmpeg
- ffprobe
- Chromium
- Remotion
- faster-whisper
- Whisper models
- Arabic font packages
- Codex CLI

Those belong in WSL and, where practical, inside the project/container environment unless later testing proves a host-native tool is materially better.

## Recorded environment — 2026-09-01

```text
Windows build:               10.0.26200.8037
WSL version:                 2.7.12.0
WSL kernel:                  6.18.33.2-2
Default distribution:        Ubuntu
Default WSL version:         2
Ubuntu state:                Running
Docker Engine:               29.7.2 (Linux/amd64, inside WSL)
Docker API:                  1.55
Docker Compose:              v5.5.0
Git:                         2.43.0
Karve repository:            cloned successfully
Chosen Karve data path:      ~/karve-data/
Windows Docker installation: not used / not required
Docker runtime health:       confirmed by user
Storage capacity:            confirmed sufficient by user
```

## Pass criteria

P0 is closed because all required conditions are satisfied:

- WSL2 works.
- Ubuntu starts normally.
- Git can access and clone the Karve repository.
- Docker Engine and Compose are available inside WSL.
- Docker runtime health is confirmed.
- storage capacity is confirmed sufficient for the MVP baseline.
- `~/karve-data/` is selected as the persistent WSL-side data root.

## Next phase

P1 is now active. See [`P1-CONTAINER-BASELINE.md`](P1-CONTAINER-BASELINE.md).
