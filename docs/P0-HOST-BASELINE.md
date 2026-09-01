# P0 — Host Baseline

This phase validates the host before Karve installs or runs the actual media/AI stack.

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

**Docker is intentionally not required on the Windows host.** Karve's Docker Engine is expected to run inside WSL/Ubuntu. Windows remains only the outer host for WSL.

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

## Test order

Run the checks in this order. Record results before changing the machine.

### 1. Windows / WSL status

From PowerShell:

```powershell
wsl --status
wsl --version
wsl -l -v
```

Expected:

- WSL default version is 2.
- Ubuntu is present.
- Ubuntu reports version 2.

### 2. Start Ubuntu

```powershell
wsl -d Ubuntu
```

If your distribution has a different name, use the value shown by `wsl -l -v`.

Inside WSL:

```bash
uname -a
cat /etc/os-release
```

### 3. Git

Inside WSL:

```bash
git --version
```

Then verify repository access:

```bash
git ls-remote https://github.com/codex-corp/Karve.git HEAD
```

A successful clone of the repository also satisfies the repository-access check.

### 4. Docker

Inside WSL:

```bash
docker version
docker compose version
docker run --rm hello-world
```

The Docker daemon is expected to be Linux-native inside WSL for this machine; no Windows Docker installation is required.

### 5. Storage

Inside WSL:

```bash
df -h ~
df -h /
```

We need enough room for:

- Docker images;
- temporary source media;
- Whisper model cache;
- render intermediates;
- final renders.

No hard minimum is fixed yet because the correct number depends on source-video size and model choice. For the MVP, record the available space first; we will set a practical threshold after the first media/transcription benchmarks.

### 6. Persistent data location

Chosen default:

```text
~/karve-data/
```

This resides on the WSL/Linux filesystem, not under `/mnt/c`, for active processing.

Planned structure:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
└── generated-components/
```

Do **not** create or populate these directories with application dependencies yet; P1 owns that setup.

## Recorded environment — 2026-09-01

```text
Windows build:              10.0.26200.8037
WSL version:                2.7.12.0
WSL kernel:                 6.18.33.2-2
Default distribution:       Ubuntu
Default WSL version:        2
Ubuntu state:               Running
Docker Engine:              29.7.2 (Linux/amd64, inside WSL)
Docker API:                 1.55
Docker Compose:             v5.5.0
Git:                        2.43.0
Karve repository:           cloned successfully
Chosen Karve data path:     ~/karve-data/
Windows Docker installation: not used / not required
```

## Current P0 status

**Almost PASS.** The core architecture assumptions are confirmed:

- WSL2 is healthy.
- Ubuntu runs under WSL2.
- Docker Engine and Compose are available inside WSL.
- Git is available.
- Karve has been cloned successfully.
- the WSL-native runtime model is confirmed.

Two recorded checks remain before formally closing P0:

```bash
docker run --rm hello-world
df -h ~
```

`df -h /` may also be recorded, but `df -h ~` is sufficient if the home directory is on the same filesystem intended for `~/karve-data`.

## Pass criteria

P0 passes when all of the following are true:

- WSL2 works.
- Ubuntu starts normally.
- Git can access the Karve repository.
- Docker is reachable inside WSL.
- `docker run --rm hello-world` succeeds.
- the available space for the chosen WSL-side data path has been recorded.
- `~/karve-data/` is confirmed as the persistent WSL-side data root.

## After P0

Only after P0 passes do we begin P1 and add:

- Dockerfile;
- Dev Container;
- persistent bind mounts;
- bootstrap helper;
- doctor command;
- Node/Python/FFmpeg/Remotion/transcription runtime dependencies.
