# Karve VideoShot — Visual QA & Pixel Inspection Protocol

Quality is not compilation. A Remotion composition that compiles with zero TypeScript errors can still fail completely as a technical explainer. `karve-videoshot` enforces an objective visual inspection protocol derived from real production design critiques.

---

## 1. The Cardinal Rule: Inspect Rendered Pixels

**Never approve a visual from JSON, JSX, or console logs alone.**

Human viewers do not experience code; they experience rendered pixels on a display. 

> ### ⚠️ Vision Inspection Grounding
> **Do not pretend text-only Bifrost messages are visual inspection.**  
> Text-only models can only reason about code syntax and string labels; they cannot detect visual overlap, clipping, contrast clashes, or dead optical space.  
> Visual QA requires **passing the actual rendered PNG keyframe files** to a vision-capable multimodal evaluator (e.g. Antigravity IDE binary image inspection via `view_file`, an OpenAI-compatible vision API endpoint taking base64 `image_url` payloads, or direct human review).

---

## 2. Dynamic Keyframe Still Selection

Do NOT force hard-coded semantic labels (like Query, Scan, Index). Keyframe stills must be selected **dynamically from the actual storyboard** to cover critical moments of visual transformation:

1. **Opening Baseline State**: Beat 1 initial condition, layout establishment, and visual context.
2. **First State Transition**: The initiation of the active mechanism or event trigger.
3. **Mid-Process Traversal / Flow**: Active work in progress (e.g. packet routing, queue iteration, algorithm execution).
4. **Peak Complexity State**: The most information-dense beat where multiple interconnected elements or data streams coexist on canvas.
5. **State Confirmation / Resolution**: The moment of truth (e.g. hash match, ACK confirmation, packet drop, record retrieval).
6. **Comparison / Modal Overlay**: Any split-screen comparative state or high-contrast overlay.
7. **Final State & Takeaways**: The concluding system equilibrium or architectural trade-off summary.

---

## 3. The 7 Quality Pillars (Scoring 1.0 – 10.0)

| Pillar | Passing Threshold | Critical Evaluation Questions |
| :--- | :---: | :--- |
| **1. Immediate Comprehension** | $\ge 9.0$ | Can a developer understand the core mechanism within 3 seconds? Is the visual intuitive? |
| **2. Composition & Spacing** | $\ge 9.0$ | Are canvas zones balanced? Is there dead space in the primary optical zone? Is there uncomfortable border crowding? |
| **3. Focal Hierarchy** | $\ge 9.2$ | Does the eye land immediately on the primary actor? Are secondary elements properly subdued? |
| **4. Semantic Correctness** | $\ge 9.5$ | Does the visual topology faithfully embody technical reality? (e.g. unordered data must visibly look unsorted). |
| **5. Graphical Craftsmanship** | $\ge 9.0$ | Are stroke weights consistent (1.5–3.5px)? Are corner radii harmonious? Is typography hierarchy crisp? |
| **6. Motion Clarity & Pacing** | $\ge 9.0$ | Does every movement communicate meaning? Is the cadence digestible without visual churn? |
| **7. Professional Polish** | $\ge 9.2$ | Does the visual look like a publication-grade technical explainer, free of generic AI gradient/SaaS card tropes? |

A **PASS** verdict requires all 7 pillars to meet or exceed their passing thresholds.

---

## 4. Defect Classification & Routing

When defects are observed during Stage H, classify them strictly by category so corrections route to the appropriate layer:

| Defect Category | Example Observed Defect | Routing Destination |
| :--- | :--- | :--- |
| `SEMANTIC` | Data representation falsifies technical reality (e.g. showing a FIFO queue popping items from the middle) | Stage D (Visual Spec Data) |
| `LAYOUT` | Primary optical center has large dead space while action is crowded into an edge | Stage B / D (Canvas Zones) |
| `COLLISION` | Residual background text or connectors remain visible behind a new overlay | Stage E / F (Fade Lifecycle) |
| `PRECISION` | Dynamic connector arrow or ray anchors to empty space instead of target node | Stage F (SVG Coordinates) |
| `MOTION` | Transition is too abrupt ($<6$ frames) or drags without new pedagogical value | Stage E (Timing Cadence) |
| `TYPOGRAPHY` | Code tokens or technical labels fall below 18px and are illegible on mobile | Stage D (Typography Scale) |
| `ASSET` | Missing architectural icon or incorrect glyph | Stage A / D (Asset Injection) |

---

## 5. Targeted Revision Protocol (Stage I)

To avoid regressions, follow the **Targeted Revision Rule**:
1. **Never Redesign from Scratch**: Redesigning after render introduces new layout errors and destroys timing calibrations.
2. **Formulate a Bounded Defect List**: Specify exact issue IDs (e.g., `P1_QUEUE_ORDER`, `P2_CENTER_DEAD_SPACE`, `P3_MODAL_CLEANUP`, `P4_ARROW_ANCHOR`).
3. **Verify Stills First**: After patching code, re-render only the affected still frames. Visually confirm the fix before spending time rendering the full video.
4. **Enforce 2-Cycle Limit**: Maximum of 2 correction passes. If critical defects persist after 2 iterations, halt and report blockers.
5. **Final Output**: Document verification in `qa-final.json`.
