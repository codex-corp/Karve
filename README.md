# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is built through explicit gates: each phase must work on the real WSL/Docker host and pass a user-facing quality review before the next phase becomes active.

## Core principles

- Keep the Windows host clean; run the project toolchain in WSL/Docker.
- Persistent media, caches, models, and generated state live outside disposable containers.
- Follow **adopt > adapt > build**: reuse mature OSS before implementing equivalents.
- FFmpeg handles deterministic media work; LLMs decide semantic intent, not rendering mechanics.
- Bifrost is the LLM boundary; do not duplicate Bedrock integration in Karve.
- CPU is the guaranteed baseline; GPU is optional optimization.
- Arabic is a first-class target.
- No databases, queues, workers, or microservices until a measured need appears.
- Technical PASS and product-quality PASS are separate gates.

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container (Ubuntu 24.04)
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
        P5 rough cut
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
| Container base | Ubuntu 24.04 |
| Node | Node 22 from the official Node image, copied into the Ubuntu runtime stage |
| Browser | Google Chrome Stable from Google's signed Debian repository; no Ubuntu Chromium Snap dependency |
| Media | FFmpeg / ffprobe |
| Transcription | local faster-whisper |
| P3 quality/default | `large-v3` / CPU INT8 |
| P3 fast | `turbo` / CPU INT8 |
| Model storage | persistent `~/karve-data/models/whisper` |
| Forced alignment | deferred; WhisperX only if measured need |
| P4 LLM boundary | existing local Bifrost router |
| P4 quality/default | `bedrock/qwen.qwen3-235b-a22b-2507-v1:0` |
| P4 fast candidate | `bedrock/apac.amazon.nova-lite-v1:0` — re-probe required |
| P4 schema validation | Ajv CLI inside the disposable image |
| P5 rough-cut engine | pinned `auto-editor 31.5.0` v1 timeline + Karve merge + FFmpeg render |
| P5 supplemental patterns | selectively adapt TightCut ideas without re-running ASR |
| Motion | Remotion in P6+ |
| Coding/motion fallback | Codex CLI in P7 |
| State | filesystem + versioned JSON |

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS.
- **P2 — Media ingest:** PASS.
- **P3 — Arabic transcription:** PASS.
- **P4 — Structured edit planning:** PASS on the real Karve -> Bifrost -> AWS Bedrock quality route.
- **P5 — Rough cut:** ACTIVE.
- **P6 — Captions + standard motion:** blocked by P5.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and the active phase document.

## P3 accepted result

Karve has a working local Arabic transcription layer using `faster-whisper 1.2.1` / `CTranslate2 4.8.2`, CPU INT8, word timestamps, VAD, persistent model cache, and versioned `transcript.json` output.

A same-source difficult Aleppine/Syrian A/B showed that `large-v3` materially improved several semantically important phrases while `turbo` remained substantially faster. V1 therefore uses `large-v3` as Quality/default and keeps `turbo` as Fast. Raw ASR is preserved and word probabilities remain soft confidence signals rather than truth scores.

## P4 accepted result

The real host proved the complete application path:

```text
Karve container
  -> http://127.0.0.1:10020
  -> Bifrost
  -> bedrock/qwen.qwen3-235b-a22b-2507-v1:0
  -> strict json_schema
  -> validated edit-plan.json
```

`sample-3-large` passed with 7 keep decisions, 1 remove decision, and 3 relevant visual intents. `real-p2` passed with 2 keep decisions, 2 semantic false-start removals, and 2 visual intents. The quality request completed in one attempt with about 9.46 seconds wall-clock generation time and passed the local Ajv schema plus Karve timeline invariants.

The Qwen route is the accepted P4 quality/default path. Gemini is intentionally not used by the current path.

The previous Nova 2 Lite Fast ID returned an AWS 400 on the real account. The Fast candidate is therefore corrected to `bedrock/apac.amazon.nova-lite-v1:0` from the host model inventory, but it remains optional and must be re-probed before being treated as verified. This does not block the accepted Qwen quality route.

The exact installed Bifrost version/commit was not captured in the reported gate. Karve only depends on the live-tested `/health`, `/v1/models`, and `/v1/chat/completions` contract, so this is recorded as a reproducibility follow-up rather than a functional blocker.

## Current P5 boundary

P5 turns the validated P4 semantic plan into a watchable rough cut. It uses the pinned `auto-editor 31.5.0` CLI for deterministic dead-space proposals, merges them with P4 semantic decisions and keep protection, maintains source-to-output time mapping, and renders through FFmpeg.

P5 must not implement captions, Remotion motion graphics, or P6 visual styling early.
