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
| P3 quality/default | `large-v3` / CPU INT8 |
| P3 fast | `turbo` / CPU INT8 |
| Model storage | persistent `~/karve-data/models/whisper` |
| Forced alignment | deferred; WhisperX only if measured need |
| P4 LLM boundary | existing local Bifrost router |
| P4 quality/default | `bedrock/qwen.qwen3-235b-a22b-2507-v1:0` |
| P4 fast | `bedrock/apac.amazon.nova-2-lite-v1:0` |
| P4 schema validation | Ajv CLI inside the disposable image |
| Motion | Remotion in P6+ |
| Coding/motion fallback | Codex CLI in P7 |
| State | filesystem + versioned JSON |

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS.
- **P2 — Media ingest:** PASS on synthetic + representative real video.
- **P3 — Arabic transcription:** PASS after real-host technical and manual multi-sample quality gates.
- **P4 — Structured edit planning:** IMPLEMENTED; real WSL/Bifrost/Bedrock host gate pending.
- **P5 — Rough cut:** blocked by P4.
- **P6 — Captions + standard motion:** blocked by P5.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and the active phase document.

## P3 accepted result

Karve has a working local Arabic transcription layer using `faster-whisper 1.2.1` / `CTranslate2 4.8.2`, CPU INT8, word timestamps, VAD, persistent model cache, and versioned `transcript.json` output.

A direct same-source A/B on a difficult fast Aleppine/Syrian sample showed that `large-v3` materially improved several semantically important phrases (`فهد`, `وقت تشوف`, `عم يحكي`, `لغتك`) while `turbo` remained substantially faster. V1 therefore uses `large-v3` as the Quality/default profile and keeps `turbo` as the Fast profile. Neither model is treated as perfect on difficult dialect/proper-name content.

The raw ASR artifact is preserved. Word probabilities are retained as soft confidence signals for later planning/QA, not as proof that a word is correct.

## Current P4 boundary

P4 turns transcript + deterministic media metadata into a strict versioned `edit-plan.json` through the existing Bifrost router.

The real-host Bifrost contract used by Karve is intentionally small:

```text
http://127.0.0.1:10020
GET  /health
GET  /v1/models
POST /v1/chat/completions
```

Current model profiles:

```text
quality/default -> bedrock/qwen.qwen3-235b-a22b-2507-v1:0
fast            -> bedrock/apac.amazon.nova-2-lite-v1:0
```

Gemini is intentionally not used by the current P4 path.

P4 uses `json_schema` when the selected Bedrock route proves it supports strict structured output. If that specific route supports only JSON mode, Karve can use explicit `json_object` mode while still enforcing the same local Ajv schema and semantic invariants.

The P4 Compose override uses host networking only for P4 commands so the container can reach Bifrost on WSL localhost without exposing the gateway on `0.0.0.0`.

## P4 host verification

After pulling the P4 implementation:

```bash
git pull
bash scripts/bootstrap.sh
bash scripts/p4-bifrost-probe.sh
bash scripts/p4-run.sh sample-3-large
bash scripts/p4-verify.sh sample-3-large
```

Then inspect:

```bash
jq . ~/karve-data/projects/sample-3-large/edit-plan.json
jq . ~/karve-data/projects/sample-3-large/edit-plan.meta.json
```

Do not begin P5 until the real edit plan is both structurally valid and manually judged useful against the source video.
