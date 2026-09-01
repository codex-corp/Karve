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

## Phase discipline

Before changing code: read `README.md`, `docs/ROADMAP.md`, `docs/OSS-ADOPTION.md`, identify the active phase, read its document, implement only that gate, and record deviations instead of expanding scope silently.

## Current phase

Current active phase: **P3 — Arabic transcription**.

P0, P1, and P2 are closed as PASS.

P3 is limited to local speech-to-text over the existing P2 `audio.wav` artifact:

- faster-whisper runtime in the disposable image;
- persistent model weights outside image/container;
- Arabic/English language selection/detection;
- segment timestamps;
- word timestamps and probabilities;
- versioned `transcript.json`;
- CPU performance/quality measurement;
- one representative Arabic manual-quality gate.

Default P3 baseline: faster-whisper 1.2.1, `turbo`, CPU INT8, beam 5, word timestamps on, VAD on.

Do **not** implement P4+ during P3: no Bifrost planning, edit-plan schema, semantic edit decisions, auto-editor/TightCut rough cuts, Remotion/captions, Codex motion generation, WhisperX without measured need, or GPU-only requirements.

## Design preferences

- TypeScript/Node.js for orchestration when materially needed.
- Shell for small deterministic wrappers.
- Python for transcription because the upstream ASR ecosystem is Python-native.
- FFmpeg/ffprobe for deterministic media operations.
- Filesystem + versioned JSON for initial state.
- Small explicit adapters at external boundaries.
- Mature OSS over custom equivalents when contracts/licenses fit.

## Definition of done

A change is done only when the active phase acceptance criteria pass on the target environment, behavior is reproducible, persistent data/models survive rebuilds, failure messages are actionable, and unnecessary infrastructure is avoided.
