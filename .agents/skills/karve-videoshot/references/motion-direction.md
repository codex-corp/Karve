# Karve VideoShot — Motion Direction & Choreography

This document governs **Stage E (Motion Direction)**. It defines how motion is designed to communicate technical meaning rather than provide superficial ornamentation.

---

## 1. The Core Philosophy: Motion as Explanation

In technical explainers, every animation must answer a single question:
> **"What does this movement teach?"**

If an animation does not explain a mechanism, state change, or spatial relationship, it should be removed. Motion must never exist merely because an element entered the canvas.

### The Semantic Motion Taxonomy
Motion choreography should be derived from the specific pedagogical mechanism described in the storyboard:

| Pedagogical Mechanism | Typical Teaching Goal | Kinetic / Visual Behavior |
| :--- | :--- | :--- |
| **Stream / Packet Flow** | Illustrating request routing, pipelines, message dispatch | Linear or smooth bezier translation along directed paths with arrival deceleration. |
| **Inspection / Iteration** | Demonstrating sequential evaluation or cumulative search cost | Staged, rhythmic cadence stepping element-by-element with synchronized state feedback badges. |
| **State Transformation** | Showing compilation, token parsing, or data mutation | In-place element cross-dissolve, shape metamorphosis, or structured decomposition. |
| **Filtering / Pruning** | Demonstrating reduction of search space or dropping invalid items | Unselected branches, rejected packets, or expired items dim to low opacity ($20\%-30\%$) or scale down. |
| **Indirection / Dereference** | Illustrating pointer lookup, memory access, or foreign keys | Energized vector path drawing from source key/address directly to target memory/disk block. |
| **Confirmation / Rejection** | Signifying ACK, validation pass, error, or retry | Crisp accent pulse ($3–5$ frames) with subtle scale punch-in ($1.0 \to 1.05 \to 1.0$) or lateral shake for errors. |
| **Side-by-Side Comparison** | Contrasting before/after, sync vs. async, or performance orders | Symmetrical dual-track motion; synchronized counter progression highlighting orders of magnitude difference. |
| **Stage Yielding** | Preventing visual noise when focus shifts | Obsolete parent elements smoothly fade out ($0.2\text{s}–0.4\text{s}$) before a modal overlay or new stage enters. |

*(Note: Sequential scanning and B-tree pruning in the case study were specific instances of Inspection and Pruning tailored to database indexing).*

### Anti-Patterns to Avoid
- ❌ **Mindless Fade-Slide-Up Loops**: Do not animate every card entering from the bottom with a 15px slide-up.
- ❌ **Gratuitous Bounces**: Do not use bouncy spring physics on serious technical data or code blocks.
- ❌ **Simultaneous Competing Motion**: Do not animate two unrelated regions of the screen at the same time.

---

## 2. Choreography & Visual Hierarchy

When multiple elements react to a single event, use **staggered hierarchy**:
1. **Primary Actor (0–6 frames lead)**: The trigger element moves first (e.g. an incoming request arrives, or a pivot comparison activates).
2. **Secondary Reaction (6–18 frames)**: Connected paths or dependent nodes respond (e.g. connector line draws, branch dims, queue shifts).
3. **Tertiary Confirmation (18–30 frames)**: The status badge or metric counter updates.

This directs the viewer's eye along a clear path of causality rather than presenting a chaotic burst of simultaneous motion.

---

## 3. Deterministic Frame Math & Easings

All motion specifications must provide exact mathematical curves compatible with Remotion:

### Easing Curve Presets
- **Deceleration / Entrance (`ease_out_expo`)**:
  `cubic-bezier(0.16, 1, 0.3, 1)`  
  *Use for: Structural entrances, card overlays, HUD transitions.*
- **Linear / Cadence (`linear`)**:
  `linear`  
  *Use for: Steady algorithmic scans, timer sweeps, clock counters.*
- **Sharp Acceleration-Deceleration (`ease_in_out`)**:
  `cubic-bezier(0.65, 0, 0.35, 1)`  
  *Use for: Camera plane pans, coordinate shifts, node repositioning.*
- **Clean Exit (`ease_in_quad`)**:
  `cubic-bezier(0.4, 0, 1, 1)`  
  *Use for: Yielding the stage, fading out superseded structures.*

---

## 4. `motion-spec.json` Output Contract

The Motion Director outputs `motion-spec.json` where every animated property is explicitly mapped:

```json
{
  "element_id": "routing_arrow",
  "property": "strokeDashoffset",
  "frame_range": [120, 150],
  "duration_frames": 30,
  "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
  "remotion_interpolation": {
    "input_range": [120, 150],
    "output_range": [600, 0],
    "extrapolate": "clamp"
  },
  "pedagogical_purpose": "Demonstrates HTTP request passing through gateway boundary into authorization filter."
}
```
