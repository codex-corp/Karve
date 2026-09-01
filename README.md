# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is intentionally built in gated phases. Each phase must produce a small, testable capability before the next one begins.

## Core principles

- Keep the Windows host clean; run the project toolchain in WSL/Docker.
- Persistent media, caches, models, and generated state live outside disposable containers.
- Reuse mature OSS before implementing equivalents.
- FFmpeg handles deterministic media work; LLMs later decide semantics, not rendering mechanics.
- Bifrost is the future LLM boundary; no direct Bedrock duplication.
- CPU is the guaranteed baseline; GPU is an optimization.
- Arabic is a first-class target.
- No databases/queues/microservices until a measured need appears.

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container
```

Persistent state:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
├── generated-components/
└── state/
```

## Pipeline

```text
Source video
    |
    v
FFmpeg / ffprobe
    |
    +--> source.json
    +--> audio.wav
    |
    v
faster-whisper
    |
    v
transcript.json
    |
    +--------------------+
    |                    |
    v                    v
Deterministic        Bifrost LLM
media analysis       edit/content planning
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

## Technology choices

| Concern | Choice |
| --- | --- |
| Host | Windows 11 + WSL2 |
| Runtime | Docker Engine + Compose inside WSL |
| Media | FFmpeg / ffprobe |
| Transcription | local faster-whisper |
| P3 default model | `turbo` / CPU INT8 |
| Model storage | persistent `~/karve-data/models/whisper` |
| Forced alignment | deferred; WhisperX only if measured need |
| Motion | Remotion in P6+ |
| LLM routing | existing Bifrost router in P4 |
| Coding/motion fallback | Codex CLI in P7 |
| State | filesystem + versioned JSON |

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS.
- **P2 — Media ingest:** PASS on synthetic + representative real video.
- **P3 — Arabic transcription:** TECHNICAL PASS; manual source-vs-transcript quality acceptance remains.
- **P4 — Structured edit planning:** blocked by final P3 quality gate.
- **P5 — Rough cut:** blocked by P4.
- **P6 — Captions + standard motion:** blocked by P5.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and the active phase document.

## Current P3 result

The real `real-p2` Arabic sample passed local inference, transcript-contract verification, and model-cache persistence verification using `faster-whisper 1.2.1` / `CTranslate2 4.8.2` with the `turbo` model on CPU INT8.

Measured baseline:

```text
source:             ~36.05 s
transcription:      4.30 s
realtime factor:    ~0.119
segments:           13
words:              36
language:           ar (1.000)
model cache:        ~1.62 GB persistent
```

The remaining P3 gate is qualitative: compare `transcript.json` with the actual speech and accept Arabic/code-switching/timestamp quality. Automated PASS does not by itself measure transcription accuracy.

See `docs/P3-ARABIC-TRANSCRIPTION.md`.
