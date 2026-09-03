---
name: karve-videoshot
description: Visual Execution Director for Karve P7 technical explainers and motion graphics. Orchestrates specialist design, diagram, motion, and Remotion skills through Bifrost to produce publication-grade visual shots from an approved P7 visual mission, semantic beat, or teaching concept. Handles creative direction, storyboard, visual/motion specs, still-first QA, and targeted revisions.
---

# Karve VideoShot — Visual Execution Director

`karve-videoshot` is the production execution engine for Karve P7 technical explainers. It converts approved visual missions and pedagogical goals into publication-grade, deterministic Remotion motion graphics.

---

## 1. Operating Boundary & Execution Modes

`karve-videoshot` is an **EXECUTION SKILL**. It operates after Karve has already analyzed content and determined that a semantic beat or concept requires a visual explanation.

### Execution Modes

1. **`source_segment` (Production Default)**:
   - Operates downstream of Karve P2–P6 analysis on an existing video segment (15–30s).
   - **Strict Non-Interference Boundary**: Does NOT rerun ASR, rewrite transcripts, change rough cuts, modify timeline mappings, or alter accepted captions.
   - Input: `p7-visual-mission.json` with locked start/end timestamps, transcript excerpt, evidence manifest, and caption exclusion zones ($\ge 160\text{px}$ bottom margin).
   - Output: Rendered visual overlay composited with locked media; base audio/video and captions are preserved.

2. **`standalone_explainer` (Conceptual / Greenfield)**:
   - Generates an isolated explainer from scratch (e.g. `experiments/db-index-explainer/`).
   - Input: Concept topic, overall teaching goal, audience, and requested duration.
   - Authors its own pedagogical narration (`narration.txt`) and timeline beats.
   - Output: Complete standalone MP4 video.

---

## 2. The 10-Stage Execution Pipeline (Stages A–J)

The skill enforces a disciplined, stage-gated lifecycle across separate model contexts:

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
[Stage G: Render Pass] ────────► stills/*.png (dynamic keyframes) + preview.mp4
               │
               ▼
[Stage H: Visual QA] ──────────► qa-v1.json (inspecting actual pixels with vision)
               │
      ┌────────┴────────┐
 PASS │                 │ DEFECTS OBSERVED
      ▼                 ▼
[Stage J: Handoff]   [Stage I: Correction Loop] ──► qa-final.json (max 2 cycles)
```

For complete stage definitions and transition criteria, see [references/workflow.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/workflow.md).

---

## 3. Specialist Skill Router

`karve-videoshot` queries specialist skills through Bifrost tool calling based on the specific visual job:

| Visual Job / Need | Specialist Skill | References to Read |
| :--- | :--- | :--- |
| **Art Direction & Canvas Layout** | `ui-styling` (Default Foundation) | `SKILL.md`, `references/canvas-design-system.md` |
| **Technical Diagrams & Topologies** | `diagram-design` | `SKILL.md`, `references/semantic-patterns.md`, plus the **smallest relevant set** of `type-*.md` files (e.g. `type-tree.md`, `type-architecture.md`, `type-data-flow.md`, `type-process.md`) |
| **Editorial & Evidence Infographics** | `editorial-infographics` | As needed for comparative breakdowns or data infographics |
| **Host Video Overlay & Shot Design** | `video-talkcraft` (via P7 catalog) | Explainer shot patterns (does not replace Art Director) |
| **Software UI & Cursor Presentation** | `video-shotcraft` | Real UI walkthroughs and 2.5D screen choreography |
| **Motion Choreography & Easings** | `motion-design` | `SKILL.md`, `director/choreography.md`, `reference/timing-easing-tables.md`, `patterns/entrance-exit.md` |
| **Remotion Implementation** | `remotion-best-practices`<br>`remotion-markup` | `remotion-best-practices/SKILL.md`<br>`remotion-markup/timing.md`, `compositions.md` |
| **Custom Vector Paths & Beams** | `svg-skill` | `SKILL.md`, `reference.md` (connectors, rays, masks) |
| **Pixel QA & Critique** | `visual-qa`, `design-review` | Inspect rendered stills and MP4 frames via multimodal vision |

*Anti-Pattern*: Do NOT load `design-system` or `slides` as default art direction tools. They create generic SaaS dashboard cards and boring presentation slides.

For routing heuristics, consult [references/skill-routing.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/skill-routing.md).

---

## 4. Bifrost Tool-Calling Pattern & Hardened Security

Telling a model `"use ui-styling"` is insufficient. Downstream models must physically load installed skills via tool calls:
- Exposes: `list_skill_files`, `read_skill`, `read_skill_file`.
- Enforces: Stage-specific `ALLOWED_SKILLS` whitelists.
- Hardened Path Containment: Uses canonical `fs.realpathSync` and `path.relative` to strictly prevent `../` traversal, prefix collisions, and symlink escapes.
- Preserves: `tool_call_id` matching across multi-turn assistant loops.
- Records: Full audit trail in `skill-usage.json`.

For implementation details, see [references/bifrost-orchestration.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/bifrost-orchestration.md).

---

## 5. Non-Negotiable Best Practices

1. **Context Separation**: Run Stages B, E, F, and H in **fresh model contexts**. Do not let implementation concerns constrain early Art Direction.
2. **Clean Stage Scoping**: Stage B owns Creative Direction only; Stage C owns Storyboard; Stage D owns Visual Specification.
3. **Flexible Spatial Architecture**: Do not force rigid cookie-cutter layout boxes. Choose a spatial archetype tailored to the concept (pipeline, radial, split comparison, hierarchical storage, or cluster matrix) with purposeful negative space ($\ge 25-35\%$) and caption safe areas ($\ge 160\text{px}$).
4. **Semantic Motion**: Every animation must communicate meaning (packet flow, branch pruning, pointer indirection, state feedback). Never animate merely because an element entered the canvas.
5. **Continuous Visual Worlds**: Prefer evolving an existing visual environment across beats over replacing the whole canvas every few seconds.
6. **Minimal On-Screen Text**: Use kinetic visual structures to explain mechanisms; keep text badges minimal and scannable.
7. **Implementation Authority**: `visual-spec.json` owns layout; `motion-spec.json` owns choreography; implementation owns code. The implementer must never casually redesign the visual.
8. **Compile PASS $\neq$ Visual PASS**: Always inspect actual rendered pixels on keyframe stills dynamically selected from storyboard transitions. Do not pretend text-only Bifrost messages are visual review.
9. **Targeted Revision Rule**: Fix observed defects using a bounded defect list (max 2 cycles). Never trigger an unprompted ground-up redesign.
10. **Branding Deferred**: Branding is injected via `brand_profile` (or `style_profile`). The paper/ink museum palette from the database case study is NOT Karve's global default.

---

## 6. Progressive Loading Reference Library

For comprehensive specifications, load references on demand:

- [references/workflow.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/workflow.md): Detailed 10-stage execution pipeline, mode contracts, and compositing rules.
- [references/skill-routing.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/skill-routing.md): Visual job routing matrix and hybrid diagram type loading.
- [references/bifrost-orchestration.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/bifrost-orchestration.md): Bifrost tool schemas, execution harness, and hardened security guards.
- [references/prompt-templates.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/prompt-templates.md): Generalized prompt templates for all 7 downstream roles.
- [references/artifact-contracts.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/artifact-contracts.md): JSON schemas for `p7-visual-mission.json` and all output artifacts.
- [references/visual-direction.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/visual-direction.md): Flexible spatial archetypes, optical hierarchy, and visual metaphors.
- [references/motion-direction.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/motion-direction.md): Pedagogical motion taxonomy and Remotion frame math.
- [references/remotion-implementation.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/remotion-implementation.md): Deterministic frame-based coding standards and SVG geometry.
- [references/visual-qa.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/visual-qa.md): Still-first pixel inspection, dynamic keyframes, and vision model requirements.
- [references/db-index-case-study.md](file:///home/hany/webserver/server/www/karve/.agents/skills/karve-videoshot/references/db-index-case-study.md): Empirical case study, v1 defects, and targeted fixes (explicitly labeled as an example, not a default style).
