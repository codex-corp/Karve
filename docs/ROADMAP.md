# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable on the target environment before moving on.

## P0 — Host baseline

**Status: PASS**

Windows 11, WSL2/Ubuntu, WSL-native Docker Engine/Compose, Git access, storage, and the WSL-side persistent data root were verified.

---

## P1 — WSL + container baseline

**Status: PASS**

The real WSL/Docker gate verified the disposable image, Dev Container contract, bootstrap/doctor, UID/GID mapping, Arabic fonts, and persistent state across rebuilds.

---

## P2 — Media ingest

**Status: PASS**

Synthetic and representative real-video gates passed. P2 produces:

```text
project/
├── source.json
├── audio.wav
└── media-test.mp4
```

The real `real-p2` project verified H.264/AAC ingest, 16 kHz mono PCM extraction, metadata, and deterministic short render.

---

## P3 — Arabic transcription

**Status: PASS**

### Engine

`faster-whisper==1.2.1` with `CTranslate2 4.8.2`.

### Accepted V1 profiles

```text
quality/default:
  model: large-v3
  runtime: CPU
  compute: INT8
  beam: 5
  word timestamps: on
  VAD: on

fast:
  model: turbo
  runtime: CPU
  compute: INT8
  beam: 5
  word timestamps: on
  VAD: on
```

The real host passed local inference, transcript/timestamp validation, persistent model-cache verification, CPU performance, and manual Arabic quality review across multiple samples.

A direct same-source difficult Aleppine/Syrian A/B showed that `large-v3` was slower but materially better on several semantically important words and phrase structures. It is therefore the Quality/default profile. `turbo` remains the Fast profile. There is no automatic two-pass transcription in V1.

WhisperX remains deferred because the measured limitation is recognition of difficult words/dialect, not timestamp alignment.

Word probabilities remain available as soft confidence signals but are not treated as transcription-accuracy scores.

---

## P4 — Structured edit planning

**Status: IMPLEMENTED — REAL WSL/BIFROST HOST VERIFICATION PENDING**

### Goal

Use the existing Bifrost API router as the AI planning boundary.

### Model policy

```text
quality/default:
  bedrock/qwen.qwen3-235b-a22b-2507-v1:0

fast:
  bedrock/apac.amazon.nova-2-lite-v1:0
```

Gemini is intentionally excluded from the current default path to preserve limited credits.

### Scope

- Bifrost adapter only; no duplicate direct Bedrock SDK path;
- transcript + deterministic media metadata input;
- versioned edit-plan JSON schema;
- keep/remove ranges, retries, emphasis, punch-ins, caption emphasis, titles/callouts/explainers;
- local Ajv schema validation plus semantic timeline invariants;
- bounded retry/failure behavior;
- preserve raw ASR separately from semantic interpretation;
- use ASR confidence only as a soft signal when planning uncertain text;
- record request usage/latency/model metadata in a sidecar.

### Networking boundary

Bifrost remains on WSL localhost. A P4-only Compose override uses host networking so Karve can reach `127.0.0.1:10020` without widening the Bifrost bind address.

### Structured-output rule

Prefer strict `json_schema` after the selected Bedrock model proves it supports that response format through the installed Bifrost route. If the model only supports `json_object`, use that mode explicitly and keep the exact same local schema/semantic validation. Never parse prose.

### Gate

A real Arabic project must:

1. pass the Bifrost contract probe from inside the P4 container boundary;
2. record the installed Bifrost version/commit;
3. produce `edit-plan.json` through the quality Bedrock model;
4. pass deterministic schema + timeline verification;
5. pass manual semantic review against the real source.

P5 remains blocked until those gates pass.

---

## P5 — Rough cut

### Goal

Turn validated decisions into a watchable draft.

### Scope

- evaluate/integrate auto-editor before custom equivalent logic;
- reuse useful TightCut patterns;
- safe margins and source->output time mapping;
- audio continuity and render manifest.

### Gate

Dead space/retries are removed without clipping speech or corrupting A/V sync.

---

## P6 — Captions + standard motion

Arabic RTL captions, word/phrase highlighting, punch-ins, titles, lists, callouts, reusable Remotion components, and reel/short/YouTube profiles. Evaluate remotion-captions-kit first.

This is the first major visual-quality milestone: Karve should produce an edit that is not merely technically valid but visibly polished and publishable.

---

## P7 — Technical explainers

Concept cards, code cards, diagrams, comparisons, screenshots/images, template registry, and Codex CLI only when no reusable component exists. Reuse claude-video-kit/Vanta patterns where appropriate.

---

## P8 — QA and review

Confidence-aware decisions, render validation, overlay collision checks, optional sampled-frame multimodal QA, lightweight human review, and selective rerendering.

---

## Product-quality rule

A phase can pass its technical checks while the user-facing result is still unacceptable. For transcription, editing, captions, and motion, Karve must preserve a separate qualitative gate.

The target is a consistent Karve style rather than generic or over-edited AI output. Reusable style/profile rules should control cut aggressiveness, zoom frequency, captions, cards, transitions, and safe areas rather than allowing an LLM to improvise visual taste on every run.

Karve follows **adopt > adapt > build**: use mature OSS first, adapt selectively when needed, and write custom equivalents only when a suitable reusable implementation does not exist.

---

## Deferred until measured need

- PostgreSQL
- Redis
- queues/workers
- microservices
- local LLM hosting
- WhisperX
- GPU-only runtime requirements
- direct Bedrock integration
- full NLE/timeline UI
