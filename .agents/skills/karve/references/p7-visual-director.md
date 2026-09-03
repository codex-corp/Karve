# P7 Visual Director & Execution Protocol

This document defines the production visual execution protocol for **Karve Phase 7 (P7 — Technical Explainers & Visual Director)**. It replaces the legacy, experimental P6-C monolithic prompt pattern (*"Ask Codex to understand → plan → implement"*) with an orchestrated, staged execution pipeline delegated to the specialized `karve-videoshot` skill.

---

## 1. Ownership & Production Boundary

To prevent model hallucination and preserve upstream video integrity, Karve enforces a strict division of responsibility:

### Karve Owns (System Boundary)
- **Source Media & Audio**: Ingested and normalized media (`source.json`, `audio.wav`).
- **ASR & Transcript Grounding**: `transcript.json` remains immutable; optional display corrections live in `caption-corrections.json`.
- **Semantic Plan & Cuts**: P4 `edit-plan.json` and P5 rough cuts (`rough-cut.mp4`, `timeline-map.json`).
- **Timing & Space Constraints**: Source-to-output timestamp mappings; caption safe areas ($\ge 160\text{px}$ bottom exclusion margin).
- **Mission Packaging**: Formulating and schema-validating `p7-visual-mission.json` against `schemas/p7-visual-mission.schema.json`.
- **Final Assembly & Verification**: Combining the rendered visual shot with base media and rendering final verified output.

### `karve-videoshot` Owns (Visual Execution Direction)
- **Creative Direction**: Visual metaphor, flexible spatial architecture, typography scale, color semantics (`creative-direction.json`).
- **Semantic Storyboard**: Translating mission goals into 4–8 continuous beats (`storyboard.json`).
- **Visual Specification**: Concrete coordinate geometry and data topologies (`visual-spec.json`).
- **Motion Direction**: Deterministic frame-based choreography, easings, and interpolation (`motion-spec.json`).
- **Remotion/SVG Execution**: Self-contained React/TypeScript Remotion components in the isolated P7 sandbox.
- **Shot-Level Render & Stills**: Rendering keyframes and preview MP4.
- **Visual QA & Pixel Inspection**: Still-first evaluation of actual rendered pixels against the 7 Quality Pillars (`qa-v1.json`).
- **Targeted Correction Loop**: Bounded defect remediation (maximum 2 passes) producing `qa-final.json`.

### Specialist Skills (`video-talkcraft`, `ui-styling`, etc.)
- Provide visual vocabulary, shot-design patterns, and layout inspiration **only when queried via Bifrost tools by `karve-videoshot`**. They do NOT act as autonomous project agents.

---

## 2. Supported Execution Modes

`karve-videoshot` executes under two distinct operational contracts:

### Mode 1: `source_segment` (Normal Karve Production Mode)
- **Use Case**: A 15–30 second section of a talking-head, presentation, or interview video requires an explanatory visual shot.
- **Rule**: All upstream P2–P6 artifacts are immutable.
  - Video cut points, audio tracks, and spoken cadence are locked to `rough-cut.mp4` and `timeline-map.json`.
  - Captions remain anchored in Karve canonical styling; visual graphics must respect the caption exclusion zone ($\ge 160\text{px}$ bottom margin).
  - Remotion renders the bounded visual overlay; Karve controls final media multiplexing.

### Mode 2: `standalone_explainer` (Greenfield / Conceptual Mode)
- **Use Case**: Creating an independent, full-canvas technical explainer from scratch (e.g. algorithm visualizer, architecture animation) with no host video or source timeline.
- **Rule**: Authors its own narration script (`narration.txt`) and sets internal timeline beats freely. Remotion renders the complete standalone MP4.
- **Warning**: Must never be used as a substitute for the normal source-video pipeline when source media exists.

---

## 3. End-to-End P7 Production Workflow

```text
Karve Upstream Analysis (P2-P6)
             │ (Locked media, transcript, cuts, timeline-map)
             ▼
P7 Visual Mission Packaging
             │ (Validates p7-visual-mission.json against schema)
             ▼
Handoff to karve-videoshot
             │ (Bifrost staged tool-calling: Creative -> Storyboard -> Specs -> Code)
             ▼
Remotion / Vector Render
             │ (Passes TypeScript; renders dynamic stills + preview MP4)
             ▼
Still-First Pixel QA & Correction
             │ (Vision inspection; max 2 targeted revision passes)
             ▼
Karve Final Assembly & Verification
             │ (Multiplex with rough-cut.mp4; hash & media verification)
             ▼
Accepted Production Output (MP4)
```

---

## 4. Visual Validation Gate (Pixel QA)

For P7 visual shots: **Compile PASS is necessary but NOT sufficient.**

### Mandatory Validation Criteria
1. **Compilation**: Must pass TypeScript typechecking (`tsc --noEmit`) with zero errors.
2. **Dynamic Keyframe Selection**: Render 6–8 PNG stills chosen dynamically from actual storyboard transition moments:
   - Opening baseline state
   - Active mechanism initiation
   - Mid-process data flow / iteration
   - Peak complexity beat
   - State confirmation / resolution
   - Split comparison / modal state
   - Final state / trade-off takeaway
3. **Actual Pixel Inspection**: Inspect the rendered PNG images using a vision-capable multimodal evaluator (or human review). Evaluating text descriptions or JSX source code alone is forbidden.
4. **Targeted Correction Loop**: If defects are found (categorized as `SEMANTIC`, `LAYOUT`, `COLLISION`, `MOTION`, `PRECISION`, or `TYPOGRAPHY`), execute up to 2 targeted revision cycles on the bounded defect list. Re-verify affected stills before re-rendering the full video.

> **Scope Note**: Shot-level visual QA is strictly bounded to the generated visual shot. It is distinct from future **P8 (System QA & Review)**, which will automate pipeline-wide confidence scoring and multi-stage regression testing.

---

## 5. File & Sandbox Isolation

All P7 visual execution artifacts are isolated in the project data sandbox:
```text
~/karve-data/projects/<project-id>/p7/
├── p7-visual-mission.json
├── creative-direction.json
├── storyboard.json
├── visual-spec.json
├── motion-spec.json
├── <ShotName>.tsx
├── stills/
│   ├── frame_000.png
│   └── ...
├── qa-v1.json
├── qa-final.json
├── skill-usage.json
└── p7-visual-output.mp4
```
Generated code remains sandboxed and is never written into canonical `src/` or `remotion/` baseline directories.
