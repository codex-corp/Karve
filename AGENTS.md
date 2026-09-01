# Karve Agent Rules

This repository is intentionally developed in gated phases.

## General rules

1. Do not implement future phases early.
2. Keep the architecture local-first and simple.
3. Prefer deterministic media-processing code over LLM-generated behavior whenever the behavior can be expressed as stable code or a reusable template.
4. Keep persistent media, caches, models, and generated project state outside disposable containers.
5. Do not introduce PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and an explicit architectural decision.
6. Bifrost is the primary LLM routing boundary. Do not add direct Bedrock integration unless the existing Bifrost route cannot satisfy a documented requirement.
7. Codex CLI is a specialized coding/motion fallback, not the default decision engine for every edit.
8. CPU execution must remain a supported baseline. GPU acceleration is optional unless a future phase explicitly changes this rule.
9. Arabic is a first-class target. Preserve RTL behavior, Arabic typography, and transcription/caption correctness in every relevant phase.
10. Do not install the full media/AI toolchain globally on Windows. Prefer the project/container environment.

## Phase discipline

Before changing code:

1. Read `README.md`.
2. Read `docs/ROADMAP.md`.
3. Identify the active phase.
4. Read the active phase document.
5. Implement only what is required to satisfy that phase's acceptance gate.
6. Add or update tests/diagnostics that prove the gate.
7. Record deviations or new architectural needs instead of silently expanding scope.

## Current phase

Current active phase: **P0 — Host baseline**.

P0 is diagnostic/documentation work. Do not add application pipeline code during P0.

## Design preferences

- TypeScript/Node.js for orchestration.
- Python only where the transcription ecosystem materially benefits from it.
- FFmpeg/ffprobe for deterministic media operations.
- Remotion for reusable motion graphics and rendering compositions.
- Filesystem + versioned JSON for initial state.
- Small explicit adapters at external boundaries.
- Idempotent bootstrap and health/doctor commands.

## Definition of done

A change is not done merely because code was written. It is done when:

- the active phase acceptance criteria are satisfied;
- the behavior can be reproduced from documented commands;
- persistent user data survives environment rebuilds where applicable;
- failure messages are actionable;
- unnecessary infrastructure has not been introduced.
