# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is intentionally built in gated phases. Each phase must produce a small, testable capability before the next one begins.

## Core principles

- Keep the Windows host clean; run the project toolchain in WSL/Docker.
- Persistent media, caches, models, and generated state live outside disposable containers.
- Reuse mature OSS before implementing equivalents.
- FFmpeg handles deterministic media work; LLMs decide semantics, not rendering mechanics.
- Bifrost is the LLM boundary; no direct Bedrock duplication.
- CPU is the guaranteed baseline; GPU is an optimization.
- Arabic is a first-class target.
- No databases/queues/microservices until a measured need appears.
- Product quality matters separately from technical PASS status.

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
| P3 optional comparison | `large-v3` |
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
- **P3 — Arabic transcription:** PASS after real-host technical and manual multi-sample quality gates.
- **P4 — Structured edit planning:** ACTIVE; exact existing Bifrost API contract must be verified before implementing the network adapter.
- **P5 — Rough cut:** blocked by P4.
- **P6 — Captions + standard motion:** blocked by P5.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and the active phase document.

## P3 accepted result

Karve now has a working local Arabic transcription layer using `faster-whisper 1.2.1` / `CTranslate2 4.8.2`, CPU INT8, word timestamps, VAD, persistent model cache, and versioned `transcript.json` output.

The V1 default remains `turbo`. It is very fast and produced high-quality text on normal Arabic samples. A difficult fast Aleppine/Syrian sample was A/B tested with `large-v3`; the larger model improved some words but did not consistently solve the key dialect errors, so it remains explicit/opt-in rather than becoming the default or an automatic fallback.

The raw ASR artifact is preserved. Word probabilities are retained as soft confidence signals for later planning/QA, not as proof that a word is correct.

## Current P4 boundary

P4 turns transcript + deterministic media metadata into a strict versioned `edit-plan.json` through the existing Bifrost router.

Before the real adapter is coded, Karve must use an actual known-good Bifrost example to verify:

```text
base URL
authentication
model naming
request shape
response shape
structured/schema output support
```

Do not guess or duplicate Bedrock integration outside Bifrost.
