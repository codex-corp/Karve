# Karve VideoShot — Visual Job & Specialist Skill Routing

`karve-videoshot` is an orchestrator. It does not attempt to be an expert in typography, motion physics, and vector SVG from first principles. Instead, it queries specialist skills through Bifrost based on the current visual job.

**Core Rule**: Never load every installed skill into every stage. Enforce **Progressive Loading** based on the specific representation required.

---

## 1. Visual Job Routing Matrix

### A. General Technical Visual & Art Direction (Default Foundation)
- **Primary Skill**: `ui-styling`
- **Files to Read**:
  - `SKILL.md`
  - `references/canvas-design-system.md` (when designing custom canvas layouts)
- **Use For**: Composition, visual hierarchy, spatial architecture, color relationships, typography scale, visual rhythm, negative space, visual language.
- **Role**: This is the default Art Direction foundation for all technical explainers.

### B. Technical Diagram / System / Process / Structure
- **Primary Skill**: `diagram-design`
- **Files to Read**:
  - `SKILL.md`
  - `references/semantic-patterns.md` (common visual patterns)
  - `references/style-guide.md` (stroke weights, connector conventions, label rules)
  - **SMALLEST Relevant Set** of representation references needed for the visual job:
    - **Tree / Hierarchy / Search**: `references/type-tree.md`
    - **Database / Storage / Heap / Memory**: `references/type-db-schema.md` or `references/type-er.md`
    - **Control Flow / Logic Branching**: `references/type-flowchart.md`
    - **Execution Lifecycle / Sequence**: `references/type-process.md`
    - **Data Flow / Pipeline / Event Streams / Queues**: `references/type-data-flow.md`
    - **Distributed Systems / Cloud / Network Architecture**: `references/type-architecture.md`
    - **Metrics / Quantitative Benchmarks / Latency**: `references/type-bar.md` or `references/type-line.md`

> **Note on Hybrid Concepts**: A technical concept may legitimately require more than one diagram representation type (e.g. `type-process.md` for lifecycle sequence combined with `type-architecture.md` for cluster topology, or `type-data-flow.md` combined with `type-tree.md`). Read `SKILL.md` first, then load only the minimal set required. Do NOT load unneeded diagram types.

### C. Editorial / Infographic / Evidence Visual
- **Primary Skill**: `editorial-infographics`
- **When to Use**: When the visual job is primarily a comparative editorial breakdown, statistical evidence presentation, or conceptual infographic that requires strong data storytelling.
- **Rule**: Load in addition to `ui-styling`; do not use automatically for structural diagrams.

### D. Talking-Head / Explainer Overlay
- **Primary Skill**: `video-talkcraft` (via Karve P7 visual catalog)
- **When to Use**: When executing visuals over an existing host/presenter video.
- **Use For**: Shot design, host PiP placement, visual focus handoff, camera/plane logic, beat-aware overlays.
- **Rule**: `video-talkcraft` provides shot-pattern guidance; it does NOT replace the Art Director.

### E. Software / Product / UI Demo
- **Primary Skill**: `video-shotcraft`
- **When to Use**: When the visual job involves real application UI, software demonstrations, simulated cursor actions, product sequences, or 2.5D software presentation.

### F. Motion Direction & Choreography
- **Primary Skill**: `motion-design`
- **Files to Read**:
  - `SKILL.md`
  - Conditionally based on the motion mechanisms identified in the storyboard:
    - **Rhythmic iteration / Sequential traversal**: `director/choreography.md`, `reference/timing-easing-tables.md`
    - **State filtering / Branch elimination**: `patterns/entrance-exit.md`
    - **Vector path drawing / Connectors**: `reference/property-selection.md`
    - **Feedback pulses / State confirmation**: `director/disney-principles.md`
    - **Stage yielding / Transition exits**: `director/core-philosophy.md`

### G. Remotion Implementation
- **Primary Skills**: `remotion-best-practices`, `remotion-markup`
- **Files to Read**:
  - `remotion-best-practices/SKILL.md` (clean React component structure)
  - `remotion-markup/SKILL.md`, `timing.md`, `compositions.md` (frame timing and interpolation)

### H. Custom Vector / SVG Graphics
- **Primary Skill**: `svg-skill`
- **Files to Read**: `SKILL.md`, `reference.md`
- **When to Use**: When custom vector paths, arrows, dynamic connector arcs, pointer rays, or coordinate masks are required.

### I. Visual QA & Pixel Review
- **Primary Skills**: `visual-qa`, `design-review`
- **Use For**: Inspecting rendered still PNGs and MP4 frames for immediate comprehension, dead space, collisions, and semantic correctness.

---

## 2. Skills to AVOID as Default Art Direction

To prevent model contamination and generic output, strictly avoid these skills during technical explainer art direction:

- ❌ **`design-system`**: Pushes the model toward generic enterprise SaaS dashboards, form components, and web tables.
- ❌ **`slides`**: Pushes the model toward static, boring bulleted presentation slides with generic Chart.js cards.

Technical explainers require kinetic spatial diagrams and physical/system representations, not slide decks or SaaS admin portals.
