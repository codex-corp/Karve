# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is intentionally built in gated phases. Each phase must produce a small, testable capability before the next one begins.

## Goals

Karve should eventually accept a source video and automate most repetitive editing work:

- ingest and inspect source media;
- extract transcription-ready audio;
- transcribe Arabic and English with timestamps;
- detect silence, false starts, repeated takes, and filler speech;
- ask an LLM to produce a structured edit plan;
- apply cuts and pacing changes deterministically;
- generate Arabic/English captions;
- add punch-ins, titles, lists, code cards, callouts, and technical explainers;
- use reusable Remotion templates for standard motion graphics;
- use Codex CLI only when a missing custom motion component must be generated;
- render locally with Remotion and FFmpeg;
- keep source media, project state, caches, models, and renders persistent outside disposable containers.

## Core principles

1. **Simple before clever.** No services, queues, databases, or distributed architecture without a measured need.
2. **Local-first.** Video, audio, rendering, and transcription stay local by default.
3. **Containerized tooling.** Keep Node, Python, FFmpeg, Chromium, Whisper tooling, and related packages inside the project environment where practical.
4. **Persistent data outside containers.** Containers are disposable; project media and caches are not.
5. **Deterministic editing where possible.** The LLM decides *what* should happen; stable code decides *how* it is executed/rendered.
6. **Bifrost is the LLM boundary.** Do not add direct Bedrock integrations while the existing Bifrost router satisfies the requirement.
7. **No premature GPU dependency.** CPU execution is the guaranteed baseline. Hardware acceleration is an optimization.
8. **Arabic is first-class.** RTL captions, Arabic transcription quality, timing, and typography are MVP requirements.
9. **Phase gates.** A phase is complete only when its acceptance test passes on the real target environment.
10. **Adopt before building.** Reuse mature OSS through small adapters before implementing custom equivalents. See [`docs/OSS-ADOPTION.md`](docs/OSS-ADOPTION.md).

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container
```

Windows does not need global Node, Python, FFmpeg, Chromium, Whisper, Remotion, or Docker Desktop installations for Karve.

Persistent state lives on the WSL/Linux filesystem:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
├── generated-components/
└── state/
```

## High-level pipeline

```text
Source video
    |
    v
FFmpeg / ffprobe
    |
    +--> media metadata
    +--> transcription-ready audio
    |
    v
Local transcription
    |
    v
transcript.json
    |
    +--------------------+
    |                    |
    v                    v
Deterministic        Bifrost LLM
media analysis       content/edit analysis
    |                    |
    +---------+----------+
              |
              v
         edit-plan.json
              |
              v
       Remotion templates
              |
       missing component?
          |          |
         no         yes
          |          |
          |      Codex CLI
          |          |
          +-----+----+
                |
                v
        Remotion + FFmpeg
                |
                v
           draft/final MP4
```

## Primary technology choices

| Concern | Initial choice |
| --- | --- |
| Host target | Windows 11 + WSL2 |
| Container runtime | Docker Engine + Compose inside WSL |
| Reproducible environment | Docker + Dev Container |
| Orchestrator | TypeScript / Node.js when orchestration becomes necessary |
| Media processing | FFmpeg / ffprobe |
| Motion graphics | Remotion |
| Transcription | local `faster-whisper` |
| Forced alignment | deferred; add WhisperX only if timing tests justify it |
| LLM routing | existing Bifrost API router |
| Coding/motion agent | Codex CLI only for missing custom components |
| State | filesystem + versioned JSON |
| Database | none initially |
| Redis | none initially |
| Local LLMs | disabled initially |
| GPU | optional optimization |

## Repository layout

```text
Karve/
├── .devcontainer/       # Dev Container using the same Compose service
├── docker/              # container/runtime definition
├── scripts/             # bootstrap, doctor, phase adapters and verification helpers
├── src/                 # TypeScript application/pipeline (later phases)
├── transcription/       # speech-to-text adapter/scripts (P3)
├── remotion/            # compositions and reusable motion components (P6+)
├── templates/           # reel/short/YouTube profiles
├── schemas/             # versioned JSON schemas as they become necessary
├── config/              # defaults and local configuration examples
├── docs/                # architecture, prerequisites, roadmap, phase docs
├── AGENTS.md            # rules for Codex/other coding agents
└── README.md
```

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS on the real WSL/Docker environment.
- **P2 — Media ingest:** READY FOR WSL HOST VERIFICATION.
- **P3 — Arabic transcription:** blocked by P2 gate.
- **P4 — Structured edit planning:** blocked by P3.
- **P5 — Rough cut:** blocked by P4.
- **P6 — Captions + standard motion:** blocked by P5.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full gates.

## P2 verification

After pulling the latest `main` inside WSL:

```bash
git pull
bash scripts/p2-verify.sh
```

The synthetic gate should end with:

```text
P2 media ingest verification: PASS
```

Then run one real camera/talking-head video:

```bash
bash scripts/p2-run.sh /path/to/video.mp4 --project real-p2
```

Karve will persist:

```text
~/karve-data/projects/real-p2/
├── source.json
├── audio.wav
└── media-test.mp4
```

P2 becomes PASS only after both the synthetic WSL/Docker verification and one representative real-video ingest succeed. See [`docs/P2-MEDIA-INGEST.md`](docs/P2-MEDIA-INGEST.md).
