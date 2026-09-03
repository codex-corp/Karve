# Case Study: The Database Index Explainer

This document analyzes the reference implementation of **"Why Database Indexes Make Queries Fast"** (`experiments/db-index-explainer/`). It demonstrates the empirical validity of the `karve-videoshot` production method.

---

> ### ⚠️ CRITICAL WARNING: THIS CASE STUDY IS NOT A STYLE TEMPLATE
> **Do NOT blindly copy this case study's aesthetic into future videos.**  
> - Do NOT default to `#f5f5f5`, `#2d3142`, and `#eb6c36`.  
> - Do NOT default to paper/ink textures or Instrument Serif typography.  
> - Do NOT default to B-tree diagrams for unrelated systems.  
> 
> The aesthetic choices below were tailored specifically to conceptual database query mechanisms.  
> **Replicate the decision process, not the aesthetic.**

---

## 1. Pedagogical Intent & Visual Concept

- **Topic**: Why Database Indexes Make Queries Fast
- **Canvas**: 1920x1080 (16:9), 30 FPS, 900 frames (~30 seconds)
- **Target Audience**: Software engineers with basic SQL understanding
- **Core Teaching Goal**:
  1. Without an index, finding a row can require scanning many rows ($O(N)$ linear disk scan).
  2. An index is a separate ordered/search structure (B-tree on a key).
  3. A B-tree progressively narrows the search space ($O(\log N)$).
  4. The index leaf points directly toward the relevant table row(s) (RowID pointer dereference).
  5. Indexes improve read performance but introduce storage and write/rebalancing costs.

### Why the Metaphor Succeeded
Rather than presenting an abstract slide with bullets or a generic web dashboard, the Art Director selected an **architectural storage catalog metaphor**:
- Top HUD for persistent query context (`SELECT * FROM users WHERE id = 77;`).
- Bottom shelf for raw disk storage (unsorted data blocks).
- Upper canvas for the auxiliary B-tree search structure.
- Dynamic vector ray shooting between structures to demonstrate physical pointer indirection.

---

## 2. Deriving the 7 Semantic Beats

Rather than creating a new card for every spoken sentence, the 30-second duration was decomposed into **7 continuous semantic beats**:

1. **Beat 1 (Frames 0–135, 0.0s–4.5s)**: *Orient / Query Arrival*. Query appears in HUD; physical table shelf revealed on disk.
2. **Beat 2 (Frames 135–315, 4.5s–10.5s)**: *Demonstrate Linear Scan*. Inspection reticle steps block-by-block across unsorted rows with real-time mismatch feedback.
3. **Beat 3 (Frames 315–450, 10.5s–15.0s)**: *Introduce Auxiliary Index*. B-tree materializes in the upper stage as a separate, sorted search structure.
4. **Beat 4 (Frames 450–630, 15.0s–21.0s)**: *Progressive Search Narrowing*. Pivot comparisons at Root (`50`) and Node (`75`) dynamically dim rejected branches, illustrating 50% search space elimination.
5. **Beat 5 (Frames 630–765, 21.0s–25.5s)**: *Direct Pointer Dereference*. Leaf key `77` activates; a glowing vector ray shoots from key `77` directly into physical Row #11 with confirmed landing pulse.
6. **Beat 6 (Frames 765–834, 25.5s–27.8s)**: *Performance Contrast*. B-tree yields stage to a clean side-by-side comparison modal: $O(N)$ (1,000,000 checks) vs. $O(\log N)$ ($\approx 20$ hops).
7. **Beat 7 (Frames 834–900, 27.8s–30.0s)**: *Engineering Trade-offs*. Bottom banner presents explicit storage overhead (+20–40%) and tree rebalancing costs on writes.

---

## 3. Specialist Skills Selected & Tool-Call Provenance

During the run, the model used Bifrost tool calling to physically read real skills:

| Stage | Specialist Skill | Files Read via Tool Calls | Rationale |
| :--- | :--- | :--- | :--- |
| **Creative Direction** | `ui-styling` | `SKILL.md`, `references/canvas-design-system.md` | Defined canvas zones, optical hierarchy, typography scale, and 40px grid texture. |
| **Diagram Architecture** | `diagram-design` | `SKILL.md`, `references/semantic-patterns.md`, `references/style-guide.md`, `references/type-tree.md`, `references/type-db-schema.md` | Defined B-tree node coordinates, branching angles, and database table block schemas. |
| **Motion Choreography** | `motion-design` | `SKILL.md`, `director/choreography.md`, `reference/timing-easing-tables.md`, `patterns/entrance-exit.md`, `director/disney-principles.md` | Defined deterministic cubic-bezier curves, linear scan cadence, and branch-pruning dimming. |
| **Remotion Implementation** | `remotion-best-practices`<br>`remotion-markup`<br>`svg-skill` | `remotion-best-practices/SKILL.md`<br>`remotion-markup/timing.md`<br>`svg-skill/reference.md` | Implemented frame-based math (`interpolate`), zero wall-clock timing, and SVG vector pointer ray. |

---

## 4. The v1 QA Failures: Why Pixel Review is Mandatory

The first render (`db-index-explainer-v1.mp4`) compiled with zero errors. However, inspecting the rendered still PNGs revealed 4 critical defects:

### 1. Pre-Sorted Table Heap (Semantic Falsification - CRITICAL)
- **Defect**: The storage shelf displayed rows in sequential order (`[04, 09, 15, 23, 31... 99]`).
- **Failure**: In real databases, table heap storage is physically unordered. Showing an already-sorted table destroyed the explanation: a viewer would wonder why the query engine didn't simply binary search the table directly!
- **Fix in v2**: Randomized table rows to `[42, 09, 23, 89, 15, 93, 04, 71, 55, 31, 77, 99, 48, 82, 97, 63]`. This made the necessity of an auxiliary ordered B-tree instantly undeniable.

### 2. Center Stage Emptiness (Compositional Defect - HIGH)
- **Defect**: In Beats 1 and 2, the table sat at $Y=720$, leaving the upper center stage completely blank for 10 seconds.
- **Fix in v2**: Added architectural concept titles and a dynamic row inspection badge (`Row #6 (ID: 93) ≠ 77 MISMATCH, READ NEXT ROW`) in the center zone.

### 3. Modal Background Collision (Visual Clash - HIGH)
- **Defect**: In Beat 6, the contrast modal card overlapped the residual B-tree title text that had failed to exit cleanly.
- **Fix in v2**: Added smooth opacity fade-out of all B-tree elements prior to the modal entrance.

### 4. Imprecise Pointer Ray Anchoring (Precision Defect - MEDIUM)
- **Defect**: The pointer ray emerged from the general center of the leaf node rather than anchoring specifically to key `77`.
- **Fix in v2**: Anchored the SVG ray directly to the bottom border of key `77` and added a landing reticle on Row #11.

---

## 5. Comparative Quality Gain

| Quality Dimension | v1 Initial Render | v2 QA-Corrected Final |
| :--- | :---: | :---: |
| **Semantic Correctness** | 7.0 / 10 | **9.8 / 10** |
| **Composition & Spacing** | 7.5 / 10 | **9.4 / 10** |
| **Focal Hierarchy** | 8.0 / 10 | **9.5 / 10** |
| **Overall Verdict** | NEEDS_IMPROVEMENT | **PASS** |

Targeted defect remediation transformed a technically valid but pedagogically flawed draft into a publication-grade explainer.
