# P7 — Technical Explainers & Visual Director

## Status

**ACTIVE — ARCHITECTURE / CONTRACT GATE**

P0-P6 are closed as PASS. P7 promotes the bounded P6-C visual-direction proof of concept into a production Karve capability for technical explainers without turning Codex into the default editor or importing a large motion library into Karve.

P7 begins with contracts and validation. Do not build an unbounded runner, giant template registry, or bulk component library before the contracts pass on real material.

---

## Goal

Given an already accepted Karve project, P7 should be able to take a bounded technical segment and produce a grounded, visually explanatory result while preserving the truth, timing, captions, cuts, audio, and profile decisions already established by P2-P6.

The intended ownership boundary is:

```text
Karve owns
  truth / source artifacts
  source-output timing
  captions and accepted cuts
  evidence and validation
  orchestration and scope
  final composition / render contract

Codex owns
  bounded visual reasoning
  visual-plan generation
  selected implementation for the approved mission

video-talkcraft owns
  visual vocabulary
  shot-design guidance
  motion/design recipes
```

The core P7 rule is:

```text
understand -> plan -> validate -> implement -> assemble -> verify
```

Never start with effects or component generation.

---

## What P6-C proved

The accepted `tech-test-01` experiment established the production direction:

1. Karve can prepare source media, transcript, semantic decisions, rough-cut timing, caption corrections, and a deterministic P6 baseline first.
2. A bounded 15-30 second Codex mission can consume those artifacts without rerunning ASR, semantic planning, rough-cut analysis, or P6-B correction.
3. The installed `video-talkcraft` Skill can be used as-is for visual reasoning and recipe selection; no MCP layer or bulk vendoring is required.
4. PLAN ONLY followed by a separate IMPLEMENT + RENDER mission produces better scope control than one unbounded request.
5. The strongest visual result came from continuity across semantic beats, deliberate host yielding/restoration, and one primary visual job per beat.
6. Visual semantic hallucination is a real failure mode. Technical labels, features, APIs, metrics, UI, code, or capabilities require evidence; otherwise use neutral conceptual representation.
7. Generated code can remain isolated while reusing canonical Karve primitives such as captions and baseline overlays.

P7 productizes this proven pattern rather than redesigning it.

---

## Non-goals

P7 must not:

- replace P4 semantic edit planning;
- rerun or reinterpret raw ASR as a second transcription pipeline;
- change accepted P5 cuts or `timeline-map.json`;
- modify P6-B correction evidence or accepted caption timing/text;
- make Codex responsible for the whole video pipeline;
- copy the complete `video-talkcraft` recipe/component library into Karve;
- build a large generic template registry before measured reuse exists;
- invent product UI, code, metrics, integrations, architecture, or feature claims;
- add PostgreSQL, Redis, queues, workers, or microservices;
- require GPU acceleration for correctness.

---

## Accepted inputs

P7 reads accepted artifacts; it does not regenerate them.

Typical project inputs:

```text
source.json
transcript.json
edit-plan.json
rough-cut.mp4
rough-cut-plan.json
timeline-map.json
caption-corrections.json        # optional
p6-<profile>.plan.json
p6-<profile>.mp4                 # review/reference only
```

Technical missions may also receive real evidence/materials:

```text
source code
repository files
screenshots
screen recordings
product UI captures
documentation
diagrams
data / metrics
logos or verified brand assets
```

If evidence needed for a planned claim is unavailable, the plan must either use a neutral visual or mark the beat unresolved. It must not fabricate the missing material.

---

## Timeline contract

P7 operates in both source and output time.

Every mission must record:

```text
source_start
source_end
output_start
output_end
```

Use `timeline-map.json` to translate source timing after P5 cuts. Never assume source/output are 1:1 unless the map proves it.

All visual beats must remain within the accepted output segment and preserve P6 caption/audio synchronization.

---

## P7 visual modes

The contract supports four modes:

```text
talking_head
technical_explainer
tutorial
voiceover_explainer
```

Initial production acceptance focuses on `technical_explainer`.

### talking_head

The host remains the relationship anchor. Visuals periodically support emphasis, evidence, or orientation.

### technical_explainer

Diagrams, code, screenshots, comparisons, or evidence may become primary while the host moves aside into a side/bottom/PiP layout.

### tutorial

Real UI, code, terminal, or screen steps are primary. Visuals must teach exact sequence/action rather than simulate a fake interface.

### voiceover_explainer

Visuals can carry the explanation when no visible host needs to remain primary.

---

## Semantic-beat model

P7 plans semantic beats, not one effect per sentence or keyword.

Each beat has one primary visual job:

```text
orient
explain
demonstrate
compare
prove
emphasize
transition
```

Visual continuity is preferred. An existing scene should transform, expand, highlight, or yield before introducing another unrelated card.

Important transcript words are timing cues, not automatic commands to animate.

---

## Host-layout rules

Use the host deliberately:

- `full` when personal connection or delivery is primary;
- `side`, `bottom`, or `pip` when evidence/diagram/UI needs the stage;
- hidden only when the visual itself should carry the message.

Avoid layout churn such as repeated:

```text
full -> pip -> full -> pip
```

Prefer one continuous yield across related beats and one deliberate restoration at a narrative boundary.

For standard webcam media without alpha, prefer a rounded-rectangle PiP that preserves the native aspect ratio over a circular crop that removes body/microphone context.

---

## Evidence and semantic-truthfulness gate

P7 distinguishes three classes of visual content.

### 1. Direct evidence

Real code, UI, screenshot, capture, data, documentation, or verified asset. Prefer this whenever available.

### 2. Derived explanation

A diagram or transformation that expresses a relationship directly supported by the transcript or supplied evidence.

### 3. Neutral conceptual support

Generic nodes, arrows, categories, or shapes used when the speaker expresses scope or direction without naming exact implementation details.

The following require explicit evidence and must not be invented:

- APIs/endpoints;
- named integrations;
- product features;
- metrics/numbers;
- code behavior;
- UI/screens;
- architecture components;
- security claims;
- performance claims.

A schema-valid plan is not enough. P7 needs a semantic validator that checks evidence requirements and rejects unsupported claims before implementation.

---

## Upstream capability policy

P7 continues Karve's **adopt > adapt > build** rule with a stricter visual-production order:

```text
1. existing Karve primitive
2. installed upstream Skill / existing video-talkcraft recipe
3. pinned upstream repository when direct source inspection is needed
4. tiny experiment/project-local adapter
5. custom component only for a measured important gap
6. vendoring only after repeated proven need and license review
```

`video-talkcraft` is the primary visual-direction vocabulary for P7 because the P6-C experiment proved the Skill-first path on real Karve artifacts.

`claude-video-kit`, `video-shotcraft`, `vanta`, and other candidates remain secondary references or selectively reusable sources when a measured gap justifies them.

No MCP layer is required for the Codex -> `video-talkcraft` path.

---

## Two-pass Codex workflow

P7 uses two bounded missions by default.

### Pass 1 — PLAN ONLY

Karve supplies the mission package and accepted artifacts. Codex:

1. understands the segment and neighboring context;
2. identifies the communication/teaching goal;
3. identifies key points and evidence;
4. selects semantic beats and visual jobs;
5. chooses host layout and recipes/components;
6. writes only a structured visual plan;
7. stops.

No Remotion implementation or render is allowed in this pass.

### Validation gate

Karve validates:

- JSON Schema;
- segment/timing bounds;
- evidence references;
- allowed visual mode/job values;
- beat continuity and non-overlap policy;
- unsupported semantic claims;
- immutable input hashes when applicable;
- output scope/path.

Implementation cannot begin until the plan passes.

### Pass 2 — IMPLEMENT + RENDER

Codex receives the approved plan as the source of truth. It may inspect only the recipes/materials needed for that plan and must implement only the bounded segment.

If a recipe is unavailable or unsuitable, record the smallest substitution. Do not redesign the mission from scratch.

---

## Planned mission artifact

P7-B will define a versioned schema such as:

```text
schemas/p7-visual-mission.schema.json
```

Minimum conceptual fields:

```text
version
project_id
profile
mode
source_segment
output_segment
artifact_refs
evidence_refs
allowed_output_root
scope_rules
plan_output
implementation_output
```

The mission should be generated by Karve rather than manually rewritten for each Codex invocation.

---

## Planned visual-plan artifact

P7-C will formalize:

```text
schemas/p7-visual-plan.schema.json
```

Minimum conceptual contract:

```text
version
project_id
profile
mode
overall_teaching_goal
key_points[]
host_strategy
beats[]:
  id
  source_start
  source_end
  output_start
  output_end
  message
  visual_job
  why_visual_needed
  host_layout
  recipe_or_component
  timing_anchor
  display_text
  supporting_entities
  required_asset_or_evidence
  fallback
```

A recipe/component must never be selected only because it looks impressive.

---

## Production output isolation

P6-C used `experiments/<project-id>/`. Production P7 should move generated artifacts under the project data root rather than silently writing one-off code into canonical renderer directories.

Target shape:

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

The repository may contain the schemas, runner, validators, and reusable adapters. Project-specific generated components remain project data until repeated reuse justifies promotion to a canonical Karve primitive.

---

## Final composition ownership

Codex must not own Karve's final media contract.

Karve remains responsible for:

- accepted base video/audio;
- captions and their timing;
- profile dimensions/FPS;
- source/output mapping;
- safe areas;
- canonical reusable overlays;
- render metadata/hashes;
- final verification.

Codex-generated visuals are layers/components consumed by Karve's controlled composition path.

During early P7 vertical slices, a bounded project-local Remotion composition is acceptable to prove the contracts, but the target architecture is Karve-controlled final assembly.

---

## P7 milestones

### P7-A — Phase Contract & Production Boundary

**Status: ACTIVE**

Deliverables:

- close P6 as PASS in project status docs;
- activate P7;
- establish this phase document;
- update AGENTS/README/OSS adoption boundaries;
- lock the P6-C architectural lessons as production rules.

No runner or schema implementation is required for this gate.

### P7-B — Visual Mission Contract

Define `mission.json` and `schemas/p7-visual-mission.schema.json`. Generate bounded mission packages from accepted Karve artifacts.

### P7-C — Visual Plan Schema + Grounding Validator

Define the production visual-plan schema and deterministic/semantic validation, including evidence requirements and zero unsupported technical claims.

### P7-D — Segment Selection

Start with explicit user/P4-driven segment selection. Reuse P4 `explainer` intents and existing semantic/timeline artifacts. Add `--auto` only after explicit selection is proven.

### P7-E — Codex Plan Runner

Run one bounded PLAN ONLY Codex mission and persist the plan. No implementation if validation fails.

### P7-F — Codex Implementation Runner

Run a fresh bounded IMPLEMENT + RENDER mission using the approved plan and installed `video-talkcraft` Skill.

### P7-G — Generated Component Lifecycle

Keep one-off components project-local. Define promotion criteria for genuinely reusable Karve primitives based on repeated observed reuse.

### P7-H — Karve-Controlled Final Assembly

Integrate approved generated visual layers into the canonical P6-derived Remotion composition without surrendering captions/timing/audio/profile ownership.

### P7-I — Additional Modes

After `technical_explainer` passes, validate `tutorial`, then `talking_head`/`voiceover_explainer` as measured needs justify them.

### P7-J — Production Acceptance

Close P7 only after representative real samples pass technical and human review.

---

## First implementation slice after P7-A

Do not begin by automating Codex execution.

The first implementation work should be:

```text
P7-B mission contract
        +
P7-C visual-plan schema / validator
```

Only after Karve can generate and validate a trustworthy mission/plan should P7 add Codex runners.

---

## Acceptance samples

P7 should not close on one demonstration video. Use at least three materially different real samples:

### A. Abstract architecture / technical concept

Prove diagrams and conceptual relationships without unsupported specifics.

### B. Code / terminal explanation

Prove real source/code evidence, exact highlighting, and truthful technical interpretation.

### C. UI / tutorial explanation

Prove real screenshots/screen capture, ordered steps, exact focus/highlights, and no fabricated UI.

---

## Acceptance criteria

Every production sample must demonstrate:

1. accepted P2-P6 artifacts remain unchanged;
2. source/output timing is correct;
3. accepted captions remain correct and synchronized;
4. the visual plan passes schema and semantic grounding validation;
5. no unsupported technical claims, fake UI, fake metrics, or invented code behavior;
6. one primary visual job per semantic beat;
7. deliberate host layout with no unnecessary churn;
8. existing Karve/upstream capabilities are preferred before custom components;
9. Codex work remains bounded to the mission;
10. final output is materially easier/faster to understand than the P6 baseline;
11. render/verification metadata is reproducible;
12. manual visual-quality review passes.

---

## Rendering / acceleration policy

P7 inherits the accepted runtime rule:

- CPU correctness remains mandatory;
- FFmpeg CPU `libx264` remains the supported baseline where it is already fast enough;
- Chromium/Remotion hardware acceleration may be used when available through the WSL graphics path;
- GPU acceleration is an optimization, never a correctness dependency.

---

## Definition of done

P7 is PASS only when Karve can reproducibly create, validate, execute, assemble, and verify grounded technical visual missions across the representative acceptance set, while keeping Codex bounded, upstream capabilities reusable, prior pipeline artifacts immutable, and final visual quality meaningfully above the P6 baseline.
