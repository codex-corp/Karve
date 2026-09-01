# P0 — Host Baseline

This phase validates the host before Karve installs or runs the actual media/AI stack.

## Intent

Keep Windows clean. P0 should **inspect**, not install, the full runtime.

We want to prove that the following foundation is healthy:

```text
Windows 11
  -> WSL2
     -> Ubuntu
        -> Git
        -> Docker
        -> Karve repository
```

Everything else belongs in P1 inside the reproducible project environment.

## Host prerequisites

Required on the host:

- Windows 11
- WSL2
- an Ubuntu WSL distribution
- Docker Desktop with WSL integration, or an equivalent Docker Engine setup inside WSL
- Git available in the workflow used to clone Karve

Not required globally on Windows:

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

Those belong in the project/container environment unless later testing proves a host-native tool is materially better.

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

Do not clone yet if you want to keep this strictly diagnostic; `ls-remote` is enough to prove access.

### 4. Docker

From Windows or WSL, depending on your setup:

```bash
docker version
docker compose version
```

Then from WSL:

```bash
docker run --rm hello-world
```

This is the key P0 container gate.

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

Default proposal:

```text
~/karve-data/
```

This should reside on the WSL/Linux filesystem, not under `/mnt/c`, for the active processing workspace.

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

## P0 result template

Record the result in an issue, note, or commit using this format:

```text
P0 Host Baseline

Windows version:
WSL version:
Ubuntu distribution/version:
Git version:
Docker version:
Docker Compose version:
hello-world: PASS/FAIL
WSL home free space:
Chosen Karve data path:
Notes:
```

## Pass criteria

P0 passes when all of the following are true:

- WSL2 works.
- Ubuntu starts normally.
- Git can access the Karve repository.
- Docker is reachable from WSL.
- `docker run --rm hello-world` succeeds.
- a persistent WSL-side data path has been chosen.

## After P0

Only after P0 passes do we begin P1 and add:

- Dockerfile;
- Dev Container;
- persistent volume mounts;
- bootstrap helper;
- doctor command;
- Node/Python/FFmpeg/Remotion/transcription runtime dependencies.
