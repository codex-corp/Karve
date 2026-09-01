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
9. Arabic is a first-class target. Preserve RTL behavior, Arabic typography, and transcription/caption correctness in every relevant phase.
10. Do not install the full media/AI toolchain globally on Windows. Prefer the project/container environment.
11. **Adopt before building.** Check `docs/OSS-ADOPTION.md` before implementing a substantial capability. Prefer a stable CLI/package/API integration; adapt or build only when that is demonstrably insufficient.
12. Do not copy/vendor upstream source until its exact license is verified. Record substantial third-party code and the pinned upstream revision when vendoring/adapting begins.
13. Do not run duplicate expensive stages merely because an adopted tool contains them. Reuse Karve artifacts through adapters when possible.
14. Keep phase verification reproducible through commands documented in the active phase document.

## Phase discipline

Before changing code:

1. Read `README.md`.
2. Read `docs/ROADMAP.md`.
3. Read `docs/OSS-ADOPTION.md` for the capability being worked on.
4. Identify the active phase.
5. Read the active phase document.
6. Implement only what is required to satisfy that phase gate.
7. Add/update diagnostics that prove the gate.
8. Record deviations instead of silently expanding scope.

## Current phase

Current active phase: **P2 — Media ingest**.

P0 and P1 are closed as PASS.

P2 is limited to the deterministic media boundary:

- source validation;
- ffprobe metadata extraction;
- project working-directory creation;
- transcription-ready audio extraction/format normalization;
- deterministic short verification render;
- reproducible WSL/Docker smoke tests;
- one representative real-video ingest before closure.

Use FFmpeg/ffprobe directly through small shell adapters. Do not add another media framework when FFmpeg already provides the required behavior.

Do **not** implement P3+ behavior during P2. Specifically, do not add:

- Whisper/faster-whisper models or transcription;
- WhisperX;
- silence/filler detection;
- auto-editor/TightCut integration;
- Bifrost planning;
- edit-plan schemas;
- automatic cuts;
- Remotion compositions/captions;
- Codex-generated motion components.

## Design preferences

- TypeScript/Node.js for orchestration when orchestration is materially needed.
- Shell is acceptable for small deterministic FFmpeg/diagnostic adapters.
- Python only where the transcription ecosystem materially benefits from it.
- FFmpeg/ffprobe for deterministic media operations.
- Remotion for reusable motion graphics in later phases.
- Filesystem + versioned JSON for initial state.
- Small explicit adapters at external boundaries.
- Idempotent bootstrap and health/doctor commands.
- Mature open-source dependencies over custom equivalents when contracts/licenses fit.

## Definition of done

A change is not done merely because code was written. It is done when:

- the active phase acceptance criteria are satisfied;
- behavior can be reproduced from documented commands;
- persistent data survives environment rebuilds where applicable;
- failure messages are actionable;
- unnecessary infrastructure has not been introduced;
- relevant upstream reuse options were evaluated before custom implementation.
