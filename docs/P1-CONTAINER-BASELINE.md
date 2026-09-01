# P1 — WSL + Container Baseline

## Status

**ACTIVE**

P0 is closed as PASS based on the verified WSL2/Ubuntu/Git/Docker baseline and the user's confirmation that Docker is healthy and storage capacity is sufficient.

## Goal

Create one disposable, reproducible project environment inside WSL while keeping the Windows host clean and all important Karve data persistent outside containers.

P1 does **not** implement video ingestion, transcription, LLM planning, cutting, captions, or rendering compositions yet.

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container
```

Windows does not need global Node, Python, FFmpeg, Chromium, Whisper, or Remotion installations.

## What P1 installs inside the image

- Node.js 22
- pnpm via Corepack
- Python 3
- uv
- FFmpeg / ffprobe
- Chromium
- Git / curl / jq / basic diagnostics
- Noto Arabic-capable fonts

Later-phase dependencies remain deferred:

- faster-whisper -> P3
- Bifrost adapter -> P4
- auto-editor / TightCut integration -> P5
- Remotion application/compositions/caption packages -> P6
- Codex CLI motion fallback -> P7

This keeps the baseline image useful without prematurely adding large AI/model dependencies.

## Persistent state

Bootstrap defaults to:

```text
~/karve-data/
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

The complete root is bind-mounted into the container as:

```text
/karve-data
```

The repository itself is mounted separately at:

```text
/workspace/karve
```

Containers and images are disposable. `/karve-data` is not.

## First run

From the cloned repository inside WSL:

```bash
git pull
bash scripts/bootstrap.sh
```

`bootstrap.sh` is intentionally host-light. It does not run `apt install` on WSL. It:

1. verifies WSL;
2. verifies Docker Engine and Compose;
3. creates the persistent WSL data directories;
4. records the WSL UID/GID and data root in local `.env`;
5. validates Compose;
6. builds the project image;
7. runs the P1 doctor inside a fresh container.

The expected ending is:

```text
P1 doctor: PASS
P1 bootstrap completed successfully.
```

## Doctor

After bootstrap, rerun diagnostics at any time with:

```bash
docker compose run --rm karve bash scripts/doctor.sh
```

The doctor verifies:

- Node
- pnpm
- Python
- uv
- Git
- FFmpeg
- ffprobe
- Chromium
- jq
- repository bind mount
- `/karve-data` writability
- persistence sentinel visibility
- Arabic-capable Noto font resolution

## Persistence gate

After bootstrap passes, run:

```bash
bash scripts/p1-verify-persistence.sh
```

This test:

1. reads a sentinel created directly in the WSL-side `~/karve-data/state/` directory;
2. removes disposable Compose containers;
3. rebuilds the image;
4. starts a fresh container;
5. verifies the exact same sentinel is still visible;
6. reruns the doctor.

Expected ending:

```text
P1 persistence verification: PASS
```

## Dev Container

After `bootstrap.sh` has generated `.env`, tools supporting the Dev Container specification can open `.devcontainer/devcontainer.json`.

The Dev Container and normal `docker compose` workflow use the same `karve` service and the same Dockerfile. We intentionally do not maintain separate development and runtime environments.

## P1 gate

P1 is PASS only when both of these commands succeed on the actual WSL host:

```bash
bash scripts/bootstrap.sh
bash scripts/p1-verify-persistence.sh
```

No P2 implementation begins before that gate is recorded.

## Known intentional limitations

- CPU is the only required execution path.
- Intel GPU passthrough/acceleration is not configured in P1.
- FFmpeg uses the distribution package in the baseline image; codec/encoder suitability is measured in P2 before adding a custom FFmpeg build.
- No Whisper model is downloaded in P1.
- No Remotion composition is created in P1.
- No Codex or Bifrost credentials are placed into the image.

These are phase boundaries, not missing work.
