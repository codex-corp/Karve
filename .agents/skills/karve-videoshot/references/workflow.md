# Karve VideoShot — Staged Execution Workflow

This document details the production lifecycle enforced by `karve-videoshot`. The workflow operates in two distinct execution modes and progresses through 10 strictly gated stages (Stage A through Stage J).

---

## 1. Execution Modes

`karve-videoshot` supports two operational modes depending on upstream readiness:

### Mode 1: `source_segment` (Production Default)
- **Context**: Downstream of Karve P2–P6 analysis. Karve has already analyzed video/audio, created rough cuts, timed transcript segments, generated captions, and identified a specific 15–30s segment that requires a visual explainer.
- **Strict Non-Interference Boundary**: In this mode, `karve-videoshot` **MUST NOT** redo:
  - Speech-to-text / ASR (P3)
  - Semantic edit decisions (P4)
  - Rough cuts or silence pruning (P5)
  - Timeline mapping (`timeline-map.json`)
  - Accepted captions and corrections (P6)
- **Input Payload**: `p7-visual-mission.json` containing exact `source_start`, `source_end`, `output_start`, `output_end`, `duration_seconds`, transcript snippet, evidence manifest, and caption exclusion zones.
- **Timing & Compositing**: Locked to the millisecond to align perfectly with spoken audio. Remotion renders the bounded visual overlay; audio and base video remain locked to `rough-cut.mp4` and `timeline-map.json`. Subtitles/captions are overlaid in Karve canonical safe areas (bottom margin $\ge 160\text{px}$). Upstream artifacts are never altered.

### Mode 2: `standalone_explainer` (Conceptual / Greenfield)
- **Context**: Creating an isolated educational motion graphic from scratch (e.g. `experiments/db-index-explainer/`). There is no pre-existing talking head, source video, or external audio.
- **Input Payload**: Concept topic, overall teaching goal, target audience, requested duration (e.g. 30s), and canvas dimensions (e.g. 1920x1080).
- **Flexibility**: The skill authors its own pedagogical script (`narration.txt`), derives its own timing, and structures the semantic beats freely. Remotion renders the complete standalone MP4.

---

## 2. The 10-Stage Execution Lifecycle (Stages A–J)

```text
[Stage A: Mission Resolution] ──► Locked bounds, evidence, and visual job
               │
               ▼
[Stage B: Creative Direction] ──► creative-direction.json (ui-styling + diagram-design)
               │
               ▼
[Stage C: Semantic Storyboard] ─► storyboard.json (4–8 continuous beats)
               │
               ▼
[Stage D: Visual Specification] ─► visual-spec.json (spatial layout & topology)
               │
               ▼
[Stage E: Motion Direction] ────► motion-spec.json (motion-design choreography)
               │
               ▼
[Stage F: Remotion / Vector] ───► <Explainer>.tsx (deterministic React/SVG)
               │
               ▼
[Stage G: Render Pass] ────────► stills/*.png (6+ keyframes) + preview.mp4
               │
               ▼
[Stage H: Visual QA] ──────────► qa-v1.json (inspecting actual pixels)
               │
      ┌────────┴────────┐
 PASS │                 │ DEFECTS OBSERVED
      ▼                 ▼
[Stage J: Handoff]   [Stage I: Correction Loop] ──► qa-final.json (max 2 cycles)
```

---

### STAGE A — INPUT / VISUAL MISSION RESOLUTION
- **Tasks**: Resolve execution mode (`source_segment` vs `standalone_explainer`). Extract teaching goal, audience, evidence manifest, and timing constraints.
- **Gate**: If `source_segment`, verify upstream artifacts (`rough-cut.mp4`, `timeline-map.json`, `transcript.json`) exist and are immutable.

### STAGE B — CREATIVE DIRECTION
- **Specialist Skills**: `ui-styling` (`references/canvas-design-system.md`), `diagram-design` (`references/semantic-patterns.md`, `references/style-guide.md`).
- **Role**: Senior Information Designer & Technical Visual Art Director.
- **Scope Boundary**: Creative direction ONLY. Establishes visual metaphor, spatial architecture (pipeline, radial, split, or matrix), optical hierarchy, color semantics, typography scales, and anti-patterns. Does NOT write Remotion code and does NOT create the full storyboard or coordinate spec.
- **Deliverable**: `creative-direction.json`.

### STAGE C — SEMANTIC STORYBOARD
- **Specialist Skills**: `video-talkcraft` (via P7 visual catalog).
- **Core Principle**: Continuous visual worlds. Avoid one card per sentence; evolve a single coherent spatial environment through 4–8 continuous beats.
- **Deliverable**: `storyboard.json` (beat ID, start/end frames, visual job, primary focus, visible objects, continuity, minimal text).

### STAGE D — VISUAL SPECIFICATION
- **Specialist Skills**: `diagram-design` (smallest set of relevant representation files, e.g. `type-tree.md`, `type-architecture.md`, `type-process.md`, `type-data-flow.md`).
- **Tasks**: Translate artistic vision and storyboard into concrete geometry. Define pixel coordinates $(X, Y)$, widths, heights, margins, and exact topological data.
- **Semantic Truth Rule**: Data structures must visually exhibit the property being taught (e.g. unordered data must look unsorted; queues must show sequential order).
- **Deliverable**: `visual-spec.json`.

### STAGE E — MOTION DIRECTION
- **Specialist Skills**: `motion-design` (`director/choreography.md`, `reference/timing-easing-tables.md`, `patterns/entrance-exit.md`).
- **Role**: Senior Motion Designer.
- **Tasks**: Map every state change to exact frame ranges `[start, end]`, cubic-bezier curves, and Remotion interpolation rules.
- **Semantic Rule**: Every motion must communicate meaning (packet flow = directed translation; filtering = branch dimming; lookup = direct vector ray).
- **Deliverable**: `motion-spec.json`.

### STAGE F — REMOTION / VECTOR IMPLEMENTATION
- **Specialist Skills**: `remotion-best-practices`, `remotion-markup`, `svg-skill`.
- **Tasks**: Write clean, self-contained React/TypeScript Remotion code in the project P7 sandbox. Enforce deterministic frame-based logic (`useCurrentFrame()`). Use inline SVG for connectors and rays.
- **Gate**: Pass `npx tsc --noEmit` with zero errors.

### STAGE G — RENDER
- **Tasks**: Render at least 6–8 representative keyframe stills dynamically chosen from storyboard transition points (`remotion still`). Render full bounded MP4 (`remotion render`).
- **Deliverables**: `stills/*.png` + `preview.mp4` (or `<name>-v1.mp4`).

### STAGE H — VISUAL QA (INSPECT ACTUAL PIXELS)
- **Specialist Skills**: `visual-qa`, `design-review`.
- **Core Principle**: Inspect rendered pixels, not code or text logs. Must provide PNG still images to a vision-capable multimodal evaluator.
- **Tasks**: Evaluate stills against the 7 Quality Pillars (Immediate Comprehension, Composition & Spacing, Focal Hierarchy, Semantic Correctness, Graphical Craftsmanship, Motion Clarity, Professional Polish).
- **Deliverable**: `qa-v1.json` with itemized defect logs.

### STAGE I — CORRECTION LOOP
- **Classification**: Tag each defect by category:
  - `SEMANTIC`: Data representation error.
  - `LAYOUT`: Dead space, margin crowding, or focal inversion.
  - `COLLISION`: Background elements overlapping modal overlay.
  - `MOTION`: Bad pacing or abrupt transitions.
  - `PRECISION`: Vector connector or ray anchoring mismatch.
  - `TYPOGRAPHY`: Illegible font scales.
- **Targeted Revision Rule**: Address only the bounded defect list. Re-verify affected stills first, then re-render video. Maximum 2 cycles.
- **Deliverable**: `qa-final.json`.

### STAGE J — HANDOFF & AUDIT LOG
- **Deliverables**:
  - `creative-direction.json`
  - `storyboard.json`
  - `visual-spec.json`
  - `motion-spec.json`
  - `qa-v1.json` and `qa-final.json`
  - `skill-usage.json` (complete tool-call audit trail)
  - `stills/*.png`
  - Final rendered video (`<name>-final.mp4`)
