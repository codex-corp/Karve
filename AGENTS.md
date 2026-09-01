# Karve Agent Rules

Karve is intentionally developed through gated phases.

## General rules

1. Do not implement future phases early.
2. Keep the architecture local-first and simple.
3. Prefer deterministic media code and reusable templates over generated behavior.
4. Keep persistent media, caches, models, and generated state outside disposable containers.
5. Do not introduce PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and explicit decision.
6. Bifrost is the LLM boundary. Do not add direct Bedrock integration unless Bifrost cannot satisfy a documented requirement.
7. Codex CLI is a specialized P7 fallback, not the default decision engine for every edit.
8. CPU execution must remain supported; GPU acceleration is optional.
9. Arabic is a first-class target.
10. Do not install the full media/AI/Remotion toolchain globally on Windows or WSL.
11. Apply **adopt > adapt > build** and check `docs/OSS-ADOPTION.md` before new implementation.
12. Reuse existing Karve artifacts rather than repeating expensive work.
13. Preserve raw inputs and prior-phase JSON; derived presentation text must not silently overwrite ASR or semantic artifacts.
14. Keep verification reproducible through commands in the active phase document.
15. Product quality is separate from technical correctness.

## Phase discipline

Before changing code:

1. read `README.md`, `docs/ROADMAP.md`, and `docs/OSS-ADOPTION.md`;
2. identify and read the active phase document;
3. inspect existing artifacts/contracts;
4. implement only the smallest scope needed for the active gate;
5. validate types, schemas, scripts, and representative real artifacts;
6. inspect the final diff before publishing;
7. report remaining host/quality risks honestly.

## Current phase

Current active phase: **P6 — Arabic captions + standard motion**.

P0, P1, P2, P3, P4, and P5 are closed as PASS.

### Accepted P3 baseline

- faster-whisper 1.2.1 / CTranslate2 4.8.2;
- Quality/default: `large-v3`, CPU INT8;
- Fast: `turbo`, CPU INT8;
- word timestamps and VAD;
- persistent model cache;
- ASR probabilities are soft evidence, not truth scores;
- WhisperX remains deferred.

### Accepted P4 baseline

- local Bifrost is the only LLM boundary;
- quality/default model: `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`;
- strict JSON Schema output passed on the real route;
- Ajv and Karve semantic validation passed;
- real Arabic edit plans passed manual semantic review;
- raw transcript remains separate from semantic interpretation.

### Accepted P5 baseline

- pinned `auto-editor 31.5.0` v1 timeline;
- Karve deterministic merge with semantic safety margins and keep protection;
- FFmpeg rough-cut renderer;
- source-to-output `timeline-map.json`;
- aggressive `real-p2` and conservative `sample-3-large` real renders passed;
- A/V integrity and human audio/pacing review passed;
- Ubuntu 24.04 container runtime is the accepted baseline.

## P6 goal

Turn verified P5 output into a reusable, profile-driven styled draft with correctly mapped Arabic captions and standard motion.

### P6 adopted dependencies

```text
remotion:                 4.0.520
@remotion/cli:            4.0.520
@remotion/captions:       4.0.520
remotion-captions-kit:    0.2.0
```

Use remotion-captions-kit for headless caption timing/pagination/token state. Karve owns only the thin Arabic RTL, timeline mapping, safe-area, and visual-style layer.

### P6 may include

- versioned source/reel/YouTube profiles;
- source-to-output word and intent mapping;
- Arabic RTL and mixed-language captions;
- active-word and `caption_emphasis` rendering;
- P4-driven punch-ins;
- P4-driven title/callout cards;
- deterministic Remotion render invocation;
- plan schema, artifact hashes, and render verification;
- restrained reusable style configuration.

### P6 must not include

- new semantic edit planning;
- another Bifrost/LLM pass;
- Codex-generated components;
- technical diagrams/code cards/custom explainers;
- arbitrary effects invented per video;
- database/queue infrastructure;
- changes to raw P3/P4/P5 artifacts.

`explainer` intent must remain explicitly deferred to P7.

## P6 quality direction

- Correct Arabic shaping, order, and mixed-language readability are mandatory.
- Captions must follow mapped speech timing and stay inside safe areas.
- P4 emphasis and punch-ins must appear at mapped P5 output times.
- Do not add extra zooms or cards beyond validated intent.
- At most one title/callout card should display at once.
- Reel/YouTube profiles should contain the subject rather than blindly crop.
- Technical PASS does not close P6 without human visual review.

## Definition of done

P6 is done only when the pinned Remotion environment builds, type/mapping tests pass, representative source/reel renders verify, Arabic visual quality passes manual review, input hashes remain unchanged, a resolved dependency lockfile is captured, and the result is visibly closer to publishable output.
