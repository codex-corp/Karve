# Karve Agent Rules

Karve is intentionally developed through gated phases.

## General rules

1. Do not implement future phases early.
2. Keep the architecture local-first and simple.
3. Prefer deterministic media code and reusable upstream capabilities over generated behavior.
4. Keep persistent media, caches, models, and generated state outside disposable containers.
5. Do not introduce PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and explicit decision.
6. Bifrost is the model API boundary for Karve LLM passes. Do not add direct Bedrock integration unless Bifrost cannot satisfy a documented requirement.
7. Codex may be used only for bounded visual-production missions after Karve has established media, timing, transcript, semantic context, and evidence. Codex must not become the default editor or redo accepted pipeline stages.
8. CPU execution must remain supported; GPU acceleration is optional.
9. Arabic is a first-class target.
10. Do not install the full media/AI/Remotion toolchain globally on Windows or WSL.
11. Apply **adopt > adapt > build** and check `docs/OSS-ADOPTION.md` before new implementation.
12. Reuse existing Karve artifacts rather than repeating expensive work.
13. Preserve raw inputs and prior-phase JSON; derived presentation text must not silently overwrite ASR or semantic artifacts.
14. Keep verification reproducible through commands and contracts in the active phase document.
15. Product quality is separate from technical correctness.
16. Prefer an installed upstream Skill or pinned external repository as-is before copying components into Karve. Vendor upstream code only when a measured integration gap requires ownership or modification.
17. Visual truth is evidence-bound. Do not invent product features, APIs, UI, metrics, code behavior, architecture, or technical claims.

## Phase discipline

Before changing code:

1. read `README.md`, `docs/ROADMAP.md`, and `docs/OSS-ADOPTION.md`;
2. identify and read the active phase document;
3. inspect existing artifacts/contracts and the current working tree;
4. implement only the smallest scope needed for the active gate;
5. validate types, schemas, scripts, and representative real artifacts;
6. inspect the final diff before publishing;
7. report remaining host/quality risks honestly.

---

## Closed baseline

P0-P6 are closed as PASS.

### P3

- faster-whisper 1.2.1 / CTranslate2 4.8.2;
- Quality/default: `large-v3`, CPU INT8;
- Fast: `turbo`, CPU INT8;
- word timestamps and VAD;
- persistent model cache;
- WhisperX remains deferred.

### P4

- local Bifrost is the model API boundary;
- quality/default model: `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`;
- strict JSON Schema output plus Ajv and Karve semantic validation;
- raw transcript remains separate from semantic interpretation.

### P5

- pinned `auto-editor 31.5.0` v1 timeline;
- deterministic semantic/silence merge with keep protection;
- FFmpeg rough-cut renderer;
- source-to-output `timeline-map.json`;
- aggressive `real-p2` and conservative `sample-3-large` real renders passed;
- Ubuntu 24.04 container runtime is the accepted baseline.

### P6

- Remotion family pinned to `4.0.520`;
- `remotion-captions-kit 0.2.0` headless utilities;
- Arabic RTL/mixed-language captions;
- P3/P4 source-time mapping through P5 `timeline-map.json`;
- active-word and `caption_emphasis` rendering;
- selective P4 `punch_in`, title, and callout behavior;
- source/reel/YouTube profiles;
- optional P6-B sparse display-only ASR correction through Bifrost;
- 1:1, N:1, 1:N, and N:M correction alignment with raw-source provenance;
- deterministic schemas, hashes, media verification, and committed dependency lock;
- representative source/reel and aggressive-cut verification passed.

`transcript.json`, P4 semantic evidence, accepted cuts, and `timeline-map.json` remain immutable.

### Accepted P6-C proof

The bounded `tech-test-01` experiment proved that Karve can:

1. prepare the project through P2-P6 first;
2. hand one understood/timed segment to Codex;
3. use the installed `video-talkcraft` Skill as-is;
4. run PLAN ONLY before implementation;
5. validate/review the plan;
6. run a separate bounded IMPLEMENT + RENDER mission;
7. preserve accepted captions/timing/cuts;
8. keep generated code isolated;
9. materially improve explanatory visual quality.

The experiment also proved that unsupported visual claims are a failure mode. Neutral conceptual visuals are required when evidence does not support exact technical details.

P6-C was not promoted into the canonical P6 renderer. Its successful architecture is the starting point for P7.

---

## Current phase

Current active phase: **P7 — Technical explainers & Visual Director**.

Read `docs/P7-TECHNICAL-EXPLAINERS.md` before any P7 work.

P7 begins with an architecture/contract gate. Do not build Codex automation first.

```text
P7-A  Phase contract & production boundary        ACTIVE
P7-B  Visual mission contract                     PENDING
P7-C  Visual-plan schema + grounding validator    PENDING
P7-D  Segment selection                           PENDING
P7-E  Codex plan runner                           PENDING
P7-F  Codex implementation runner                 PENDING
P7-G  Generated component lifecycle               PENDING
P7-H  Karve-controlled final assembly             PENDING
P7-I  Additional visual modes                     PENDING
P7-J  Production acceptance                       PENDING
```

The first code implementation after P7-A is **P7-B + P7-C**.

---

## P7 ownership boundary

Karve owns:

- accepted source artifacts and evidence;
- source/output timing;
- captions and accepted cuts;
- mission scope;
- schema and semantic validation;
- evidence grounding;
- final composition contract;
- render metadata/hashes and verification.

Codex owns only bounded mission work:

- understanding the supplied segment/context;
- visual-plan generation;
- selected visual implementation after plan approval.

`video-talkcraft` supplies visual vocabulary, shot-design guidance, and motion/design recipes.

Do not turn Codex into a free-running project agent for P7 video generation.

---

## P7 upstream order

Use this order for visual capability:

```text
1. existing Karve primitive
2. installed video-talkcraft Skill / suitable upstream recipe
3. pinned upstream repository when direct source inspection is necessary
4. tiny project-local adapter
5. custom component only for an important measured gap
6. vendoring only after repeated need and license review
```

Do not copy the full `video-talkcraft` library into Karve. No MCP layer is required for the Codex -> `video-talkcraft` path.

---

## P7 mission scope

Default to one representative 15-30 second segment or one clearly bounded explainer/tutorial section.

Reuse accepted artifacts:

```text
rough-cut.mp4
transcript.json
timeline-map.json
p6-<profile>.plan.json
caption-corrections.json   # when present
edit-plan.json
real source/code/docs/screenshots/UI/data when required
```

Never rerun P2-P6 simply to prepare a P7 visual mission.

Every mission must record source and output timing. Use `timeline-map.json`; do not assume 1:1 timing unless the map proves it.

---

## P7 visual modes

Use one of:

- `talking_head`
- `technical_explainer`
- `tutorial`
- `voiceover_explainer`

Initial production acceptance focuses on `technical_explainer`.

---

## P7 visual-director workflow

Within one bounded mission:

1. understand the segment plus enough neighboring context;
2. identify the teaching/communication goal;
3. identify key points and available evidence;
4. choose the visual mode;
5. split into semantic beats;
6. assign one primary visual job per beat;
7. select host layout;
8. choose existing Karve/upstream recipes/components;
9. create a structured visual plan;
10. validate the plan before implementation;
11. implement only the approved plan;
12. stop after the bounded result and report substitutions/gaps.

Primary visual jobs:

```text
orient
explain
demonstrate
compare
prove
emphasize
transition
```

A component must never be selected only because it looks impressive.

---

## Plan-first rule

Use two passes by default.

### Pass 1 — PLAN ONLY

Produce the structured P7 visual plan and stop. Do not write Remotion implementation or render video.

### Validation

Karve must validate schema, timing, evidence, scope, and unsupported technical claims.

### Pass 2 — IMPLEMENT + RENDER

Use the approved plan as the source of truth. If a planned recipe is unavailable, choose the smallest equivalent and record the substitution; do not redesign the mission.

---

## Semantic truthfulness

Prefer, in order:

1. real code/UI/screenshot/data/documentation;
2. a diagram directly derived from supported concepts;
3. neutral conceptual support when exact details are not known.

The following require explicit evidence:

- named APIs/endpoints;
- integrations/features;
- metrics/numbers;
- code behavior;
- real UI/screens;
- architecture components;
- security/performance claims.

If evidence is unavailable, use a neutral visual or leave the beat unresolved. Never invent the missing detail.

---

## Semantic beats and host continuity

Think in semantic beats, not one card per sentence or one animation per keyword.

One beat has one primary focus. Prefer continuity: transform or expand an existing scene before creating another unrelated card.

Use the host deliberately:

- full when human connection matters;
- side/bottom/PiP when evidence or explanation needs the stage;
- hidden only when the visual itself should carry the point.

Avoid repeated full -> PiP -> full -> PiP churn. For standard webcam video without alpha, prefer a rounded-rectangle native-aspect PiP over a circular crop.

---

## Production output boundary

P7 generated artifacts should live under project data, not silently become canonical renderer source:

```text
~/karve-data/projects/<project-id>/p7/
├── mission.json
├── visual-plan.json
├── evidence-manifest.json
├── generated/
├── implementation-report.json
├── render.meta.json
├── hashes.json
└── p7-visual-<profile>.mp4
```

Project-specific components stay project-local until repeated reuse justifies promotion into Karve core.

---

## Rendering boundary

Karve retains final ownership of:

- base video/audio;
- captions;
- timing;
- profile dimensions/FPS;
- safe areas;
- canonical overlays;
- final metadata/hash verification.

CPU correctness is mandatory. FFmpeg CPU `libx264` remains a valid supported baseline. Chromium/Remotion hardware acceleration may be used when available, but it is an optimization rather than a correctness dependency.

---

## P7 acceptance direction

P7 must eventually pass at least three materially different real samples:

1. abstract architecture/technical concept;
2. real code or terminal explanation;
3. real UI/tutorial explanation.

Every accepted sample must preserve P2-P6 artifacts, pass timing/caption/evidence validation, avoid unsupported claims/fake UI/data, remain bounded, and materially improve comprehension over the P6 baseline.
