# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is intentionally built in phases. We will not start by building a full editor. Each phase must produce a small, testable capability before the next one is added.

## Goals

Karve should eventually accept a source video and automate most of the repetitive editing work:

- ingest and inspect source media;
- extract and normalize audio;
- transcribe Arabic and English speech with word/segment timestamps;
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

1. **Simple before clever.** No services, queues, databases, or distributed architecture unless a measured need appears.
2. **Local-first.** Video, audio, rendering, and transcription should stay local by default.
3. **Containerized tooling.** Keep Node, Python, FFmpeg, Remotion, Whisper tooling, Chromium dependencies, and related packages inside the project environment where practical.
4. **Persistent data outside containers.** Containers are disposable; project media and caches are not.
5. **Deterministic editing where possible.** The LLM decides *what* should happen; stable code decides *how* it is rendered.
6. **Provider abstraction without provider sprawl.** Bifrost is the primary LLM gateway. Do not add direct Bedrock integrations while Bifrost already provides the required routing.
7. **No premature GPU dependency.** CPU execution is the guaranteed baseline. Hardware acceleration is an optimization.
8. **Arabic is a first-class requirement.** RTL captions, Arabic transcription quality, timing, and typography are part of the MVP, not an afterthought.
9. **Phase gates.** A phase is complete only when its acceptance test passes on the target environment.

## High-level pipeline

```text
Source video
    |
    v
FFmpeg / ffprobe
    |
    +--> audio analysis / silence metadata
    |
    v
Local transcription (faster-whisper initially)
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
| Reproducible environment | Docker + Dev Container |
| Orchestrator | TypeScript / Node.js |
| Media processing | FFmpeg / ffprobe |
| Motion graphics | Remotion |
| Transcription | local `faster-whisper` |
| Forced alignment | deferred; add WhisperX only if timing tests justify it |
| LLM routing | existing Bifrost API router |
| Coding/motion agent | Codex CLI, only for missing custom components |
| State | filesystem + JSON |
| Database | none initially |
| Redis | none initially |
| Local LLMs | disabled initially |
| GPU | optional optimization, never an MVP requirement |

## Repository layout

```text
Karve/
├── .devcontainer/       # added when Phase 1 starts
├── docker/              # container/runtime definition
├── scripts/             # bootstrap, doctor, and environment helpers
├── src/                 # TypeScript application and pipeline
├── transcription/       # local speech-to-text adapter/scripts
├── remotion/            # compositions and reusable motion components
├── templates/           # editing profiles: reel, short, YouTube, etc.
├── schemas/             # versioned JSON schemas such as edit-plan
├── config/              # defaults and local configuration examples
├── docs/                # architecture, prerequisites, roadmap
├── AGENTS.md             # rules for Codex/other coding agents
└── README.md
```

Runtime media and generated state must **not** live in the repository. The expected WSL-side persistent location will be similar to:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
└── generated-components/
```

## Development phases

We will work through the phases in order:

- **P0 — Host baseline:** verify the Windows host, Git, WSL, Docker availability, storage, and repository workflow without installing the media/AI stack globally.
- **P1 — WSL + container baseline:** create the Docker/Dev Container environment, persistent mounts, `bootstrap`, and `doctor` commands.
- **P2 — Media ingest:** prove FFmpeg/ffprobe can inspect, extract audio from, and render a tiny test video inside the environment.
- **P3 — Arabic transcription:** add local faster-whisper, persistent model cache, and timestamped Arabic transcription.
- **P4 — Structured edit planning:** connect to Bifrost and produce a schema-validated `edit-plan.json` from transcript + deterministic metadata.
- **P5 — Rough cut:** apply silence/removal decisions and produce a valid edited draft.
- **P6 — Captions + standard motion:** Arabic RTL captions, punch-ins, titles, lists, callouts, and reusable Remotion templates.
- **P7 — Technical explainers:** structured cards, code blocks, diagrams, and Codex-generated components only when a reusable template does not exist.
- **P8 — QA and review:** draft validation, optional multimodal review, confidence handling, and a lightweight human review workflow.

Detailed gates are in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Current status

**P0 is starting now.**

The repository is intentionally documentation-first at this stage. We will validate the host and runtime assumptions before implementing the editing pipeline.

## Next action

Create the P0 host-check procedure and run it on the Windows host. Only after P0 passes do we build the WSL/container environment.
