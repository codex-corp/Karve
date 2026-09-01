# P1 — WSL + Container Baseline

## Status

**READY FOR HOST VERIFICATION**

P0 is closed as PASS. The P1 implementation is complete in the repository; the only remaining gate is to build and run it on the actual WSL host.

P1 does **not** implement video ingestion, transcription, LLM planning, cutting, captions, or rendering compositions.

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

## What P1 installs inside the image

- Node.js 22
- pnpm 10
- Python 3
- uv
- FFmpeg / ffprobe
- Chromium
- Git / OpenSSH client / curl / jq / basic diagnostics
- Noto Arabic-capable fonts
- tini as the container init

Later-phase dependencies remain deferred:

- faster-whisper -> P3
- Bifrost adapter -> P4
- auto-editor / TightCut integration -> P5
- Remotion application/compositions/caption packages -> P6
- Codex CLI motion fallback -> P7

This keeps the baseline image useful without prematurely adding large AI/model dependencies.

## Host cleanliness

`bootstrap.sh` does not install application packages on Windows or directly into the WSL distribution. It only requires WSL, Git, Docker Engine, and Docker Compose to already be available.

The script deliberately refuses to run:

- as `root`/through `sudo`, because that would produce incorrect bind-mount ownership;
- when the repository is under `/mnt/<drive>`;
- when `KARVE_DATA_ROOT` is under `/mnt/<drive>`.

The active repository and runtime data stay on the WSL/Linux filesystem for predictable Docker bind-mount performance.

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

From the cloned repository inside WSL, after pulling the P1 commit:

```bash
bash scripts/bootstrap.sh
```

`bootstrap.sh` is idempotent. It:

1. verifies WSL;
2. rejects root/sudo execution and slow `/mnt/<drive>` workspaces;
3. verifies Docker Engine and Compose;
4. creates the persistent WSL data directories;
5. records the WSL UID/GID and data root in local `.env`;
6. validates Compose;
7. builds the project image;
8. runs the P1 doctor inside a fresh container.

Expected ending:

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
- fontconfig
- container UID/GID alignment
- repository bind-mount visibility and writability
- `/karve-data` writability
- all expected persistent directories
- persistence sentinel visibility
- Arabic-capable Noto font resolution

The command checker is failure-sensitive: a missing executable causes the doctor to fail rather than being hidden by output piping.

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

The Dev Container and normal `docker compose` workflow use the same `karve` service and the same Dockerfile. Karve intentionally does not maintain separate development and runtime toolchains.

## Repository/build hygiene

- `.dockerignore` keeps Git metadata, local environment files, caches, outputs, and editor state out of the Docker build context.
- `.gitattributes` forces LF endings for shell/runtime configuration files so Windows tooling cannot accidentally introduce CRLF into scripts used by WSL containers.
- `.env` is generated locally and ignored by Git.

## Development-side verification performed before push

The P1 files were checked without publishing intermediate revisions to `main`:

- all shell scripts pass `bash -n`;
- `devcontainer.json` parses as JSON;
- `docker-compose.yml` parses as YAML and contains the expected service/mount contract;
- bootstrap control flow was exercised against a mocked WSL/Docker host twice to verify idempotence and sentinel preservation;
- root and `/mnt/<drive>` safety guards were exercised;
- doctor was exercised in both success and deliberately missing-tool cases to verify correct PASS/FAIL behavior;
- the persistence verification flow was exercised against a mock disposable-container lifecycle.

The development execution environment used for this implementation does not expose a nested Docker Engine, so the real image build and container execution are intentionally left to the actual WSL gate below.

## P1 gate

P1 becomes **PASS** only when both commands succeed on the actual WSL host:

```bash
bash scripts/bootstrap.sh
bash scripts/p1-verify-persistence.sh
```

Do not begin P2 until those two commands are recorded as passing.

## Known intentional limitations

- CPU is the only required execution path.
- Intel GPU passthrough/acceleration is not configured in P1.
- FFmpeg uses Debian Bookworm's distribution package; codec/encoder suitability is measured in P2 before considering a custom build.
- No Whisper model is downloaded in P1.
- No Remotion composition is created in P1.
- No Codex or Bifrost credentials are placed into the image.

These are phase boundaries, not missing P1 work.
