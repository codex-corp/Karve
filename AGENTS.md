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

Current active phase: **P5 — Rough cut**.

P0, P1, P2, P3, and P4 are closed as PASS.

### P3 accepted baseline

- faster-whisper 1.2.1 / CTranslate2 4.8.2;
- Quality/default: `large-v3`, CPU INT8, beam 5;
- Fast: `turbo`, CPU INT8, beam 5;
- word timestamps + VAD;
- persistent model cache;
- no automatic two-pass ASR fallback;
- WhisperX remains deferred because the measured limitation is word recognition, not alignment.

### P4 accepted baseline

- application boundary: existing local Bifrost gateway;
- quality/default model: `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`;
- strict `json_schema` worked on the real Bedrock route;
- local Ajv schema validation and Karve semantic timeline checks passed;
- real `sample-3-large` and `real-p2` edit plans passed manual semantic review;
- Qwen identified repeated/false-start material and produced relevant visual intent rather than generic over-editing;
- one real quality request completed in a single attempt at about 9.46 seconds wall-clock;
- ASR word probabilities are soft evidence only, not truth scores;
- raw `transcript.json` remains preserved separately from semantic planning.

The previous Fast P4 ID `bedrock/apac.amazon.nova-2-lite-v1:0` returned AWS 400 on the real account. The candidate is corrected to `bedrock/apac.amazon.nova-lite-v1:0` from the supplied live model inventory, but it remains optional and unverified after the ID change. Do not block P5 on this optional Fast profile.

The exact installed Bifrost version/commit was not captured during the reported P4 gate. Karve relies only on the live-tested `/health`, `/v1/models`, and `/v1/chat/completions` contract. Record the exact version when convenient for reproducibility, but do not reopen P4 solely for that bookkeeping item.

## P5 goal

Turn the original source plus validated P4 semantic decisions into a watchable, auditable rough cut.

### Mandatory OSS-first investigation

Before implementing a custom silence/dead-space engine, evaluate `WyattBlue/auto-editor` as the primary rough-cut dependency. Prefer its CLI/timeline capabilities over reimplementing equivalent detection.

TightCut may be inspected for useful safe-margin, filler, caching, or cut-merging patterns, but do not adopt its full pipeline or re-run Whisper because Karve already owns transcription.

### P5 may include

- an auto-editor CLI adapter;
- deterministic silence/dead-space proposals;
- merging those proposals with P4 semantic `remove` ranges;
- using P4 `keep` decisions as protection evidence when resolving conflicts;
- safe pre/post speech margins;
- source-to-output timeline mapping;
- merged cut-plan/timeline artifact;
- rough-cut MP4 rendering;
- render manifest;
- audio continuity and A/V sync validation.

### P5 semantic rule

P4 is the semantic editor; P5 is the deterministic executor/rough-cut stage.

Do not ask the LLM to rediscover simple silence that a deterministic tool can detect. Likewise, do not let a silence detector override a high-confidence semantic keep region without an explicit conflict-resolution rule.

Unspecified P4 timeline regions are not automatically removed. P5 must make all actual cut decisions explicit in its merged timeline artifact.

P4 visual intents (`punch_in`, `caption_emphasis`, `title`, `callout`, `explainer`) are carried forward as metadata only. They are not rendered in P5.

Do **not** implement P6+ during P5: no animated captions, Remotion motion graphics, visual callouts, Codex-generated components, or final style system.

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

For P5 specifically, natural pacing matters more than maximizing the number of cuts. False starts and dead space should disappear without clipping breaths, consonants, or meaningful pauses.

## Definition of done

A P5 change is done only when the representative real source produces a reproducible rough-cut timeline and MP4, obvious false starts/dead space are removed, meaningful speech is preserved, cut edges sound natural, A/V sync is intact, source-to-output mapping is correct enough for P6, and unnecessary infrastructure is avoided.
