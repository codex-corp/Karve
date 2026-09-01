# Karve Agent Rules

Karve is intentionally developed through gated phases.

## General rules

1. Do not implement future phases early.
2. Keep the architecture local-first and simple.
3. Prefer deterministic media-processing code over LLM-generated behavior whenever stable code or a reusable template can express the behavior.
4. Keep persistent media, caches, models, and generated state outside disposable containers.
5. Do not introduce PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and an explicit architectural decision.
6. Bifrost is the primary LLM routing boundary. Do not add direct Bedrock integration unless Bifrost cannot satisfy a documented requirement.
7. Codex CLI is a specialized coding/motion fallback, not the default decision engine for every edit.
8. CPU execution must remain supported. GPU acceleration is optional unless a future phase explicitly changes this rule.
9. Arabic is a first-class target.
10. Do not install the full media/AI toolchain globally on Windows. Prefer the project/container environment.
11. Adopt mature OSS before building equivalents; check `docs/OSS-ADOPTION.md` first.
12. Reuse prior Karve artifacts instead of repeating expensive work.
13. Keep phase verification reproducible through commands documented in the active phase document.
14. Product-facing quality is a separate acceptance criterion from technical correctness.
15. Preserve raw source artifacts; derived semantic or presentation text must not silently overwrite raw ASR output.

## Phase discipline

Before changing code: read `README.md`, `docs/ROADMAP.md`, `docs/OSS-ADOPTION.md`, identify the active phase, read its document, implement only that gate, and record deviations instead of expanding scope silently.

## Current phase

Current active phase: **P4 — Structured edit planning**.

P0, P1, P2, and P3 are closed as PASS.

### P3 accepted baseline

- faster-whisper 1.2.1 / CTranslate2 4.8.2;
- Quality/default: `large-v3`, CPU INT8, beam 5;
- Fast: `turbo`, CPU INT8, beam 5;
- word timestamps + VAD;
- persistent model cache;
- same-source difficult-dialect A/B showed meaningful semantic improvement from `large-v3` while `turbo` remains the speed profile;
- no automatic two-pass ASR fallback;
- WhisperX remains deferred because the measured limitation is word recognition, not alignment.

### P4 goal

Turn existing `transcript.json` + deterministic media metadata into a strict, versioned `edit-plan.json` through the existing Bifrost router.

P4 may include:

- versioned edit-plan schema;
- keep/remove ranges;
- repeated-take/retry decisions;
- emphasis and punch-in intent;
- caption emphasis intent;
- titles/callouts/explainer intent;
- deterministic schema validation;
- bounded retry/failure behavior;
- a small Bifrost adapter;
- usage/latency metadata sidecar.

### P4 Bifrost contract

A live host probe established the application-facing contract:

```text
base:    http://127.0.0.1:10020
health:  GET /health
models:  GET /v1/models
chat:    POST /v1/chat/completions
shape:   OpenAI-style Chat Completions
local auth: none currently required; optional Bearer token supported by Karve
```

Gateway-level `json_object` and `json_schema` request shapes have been observed. Provider/model-specific strict structured-output support must still be verified on the real P4 Bedrock models before P4 closes.

The exact installed Bifrost version/commit is still part of the real-host P4 gate. Do not invent version-sensitive gateway configuration or modify the live Bifrost configuration as part of Karve P4.

### P4 model policy

Do not use Gemini in the current default P4 path because those credits are intentionally being conserved.

```text
Quality/default:
  bedrock/qwen.qwen3-235b-a22b-2507-v1:0

Fast:
  bedrock/apac.amazon.nova-2-lite-v1:0
```

Use explicit `provider/model` IDs. Do not add automatic provider/model failover until real Karve tests justify it.

ASR word probabilities may be passed into planning as soft confidence signals, but they are not truth scores and must not be used as a hard accuracy threshold.

Do **not** implement P5+ during P4: no auto-editor/TightCut rough cut execution, Remotion/captions, Codex motion generation, full render pipeline, or new infrastructure.

## Design preferences

- TypeScript/Node.js for orchestration when materially needed.
- Shell for small deterministic wrappers.
- Python for transcription because the upstream ASR ecosystem is Python-native.
- FFmpeg/ffprobe for deterministic media operations.
- Filesystem + versioned JSON for initial state.
- Small explicit adapters at external boundaries.
- Mature OSS over custom equivalents when contracts/licenses fit.
- Strict JSON contracts over prose parsing.
- LLMs decide semantic intent; deterministic code executes media operations.

## Product-quality direction

Karve is not considered successful merely because a render or JSON artifact is valid. The target is a consistent, publishable editing style rather than generic or over-edited AI output.

Future style/profile rules should control cut aggressiveness, zoom frequency, caption behavior, cards, transitions, and safe areas. Reusable components/templates are preferred over generating visual behavior from scratch on every video.

## Definition of done

A change is done only when the active phase acceptance criteria pass on the target environment, behavior is reproducible, persistent data/models survive rebuilds, failure messages are actionable, user-facing quality is evaluated where relevant, and unnecessary infrastructure is avoided.
