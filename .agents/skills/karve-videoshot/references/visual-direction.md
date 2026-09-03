# Karve VideoShot — Visual Direction & Spatial Architecture

This document governs **Stage B (Creative Direction)** and **Stage D (Visual Specification)**. It defines how the Art Director transforms an abstract pedagogical concept into an authoritative, publication-grade visual world.

---

## 1. The Role of the Technical Art Director

The Technical Art Director (using `ui-styling` and `diagram-design`) is responsible for **conceptual clarity and spatial order**.

The Art Director must:
- Select a clear, grounded visual metaphor tailored to the specific concept (e.g. physical catalog, pipeline/assembly line, circuit routing, hub-and-spoke dispatcher, cluster nodes).
- Determine what deserves visual representation and what should remain purely in spoken narration.
- Design the spatial architecture of the 1920x1080 canvas appropriate to the topic.
- Enforce strict negative space and optical rhythm.
- Prevent generic UI tropes (cards, dashboards, floating gradient orbs, arbitrary 3D).

**The Art Director does NOT write Remotion code, and does NOT generate the full storyboard or implementation-grade visual spec.** Writing code prematurely limits visual imagination.

---

## 2. Flexible Spatial Architecture (1920x1080 Reference Canvas)

Canvas layout must be tailored to the pedagogical mechanism rather than forced into fixed, cookie-cutter boxes.

### Spatial Archetypes
Select the spatial composition that naturally embodies the concept:

1. **Pipeline / Directed Flow**: Horizontal or stepped flow of data packets through stages (e.g. API Gateway, compiler phases, message queues).
2. **Radial / Hub-and-Spoke**: Central coordinator managing peripheral tasks or queues (e.g. JavaScript Event Loop, microkernel IPC, centralized scheduler).
3. **Split / Side-by-Side Comparison**: Symmetrical left/right layout contrasting two mechanisms, algorithms, or before/after states (e.g. unindexed vs. indexed, monolith vs. microservices, synchronous vs. asynchronous).
4. **Hierarchical Stage & Underlying Storage**: Multi-tier vertical layout contrasting high-level search/cache structures with raw underlying persistence (e.g. index vs. heap, L1 cache vs. RAM).
5. **Multi-Node Cluster / Matrix**: Topology of interconnected peer or master/worker nodes (e.g. Raft consensus, Kubernetes pod scheduling, distributed hash tables).

### Universal Spatial Constraints
Regardless of the chosen archetype, every technical explainer must satisfy:
- **Optical Hierarchy**: A single, unambiguous primary focal zone that anchors the eye first.
- **Caption Safe Area**: Minimum **160px bottom margin** permanently reserved for subtitles/captions in `source_segment` mode.
- **Canvas Edge Margins**: Minimum **80px margin** on left, right, and top edges. No active visual elements should collide with the viewport edge.
- **Purposeful Negative Space**: Maintain $25\%–40\%$ unoccupied space to allow technical concepts room to breathe and avoid visual exhaustion.

---

## 3. Visual Language & Anti-Patterns

### Required Quality Principles
1. **Physicality & Texture**: Use subtle architectural cues (e.g., coordinate grid at 4% opacity, hairline borders, muted guidelines) to give structural weight to abstract systems.
2. **Harmonious Stroke Weights**: Maintain a consistent stroke hierarchy:
   - Primary active structures / connectors: `2.5px – 3.5px`
   - Framework / boundaries / node perimeters: `1.5px – 2.0px`
   - Background grids and secondary guidelines: `1.0px` (or dashed lines at low opacity).
3. **Typography Scale**: Maximum of 3 type families (Sans-serif title, Sans-serif body, Monospace code/tokens). Minimum body size on 1080p is `22px` for mobile legibility.
4. **Card Independence**: Do NOT force card containers (`surface_card`, `border_card`) if the design is better expressed as bare nodes, connected glyphs, or direct typography.

### Strict Anti-Patterns (Forbidden Clichés)
- ❌ **No SaaS Dashboards**: Do not put metrics into fake analytics widgets with sparklines.
- ❌ **No Arbitrary Cards**: Do not wrap every word in a rounded rectangle with heavy drop shadows.
- ❌ **No Gratuitous Gradients**: Do not use multi-color neon gradient backgrounds.
- ❌ **No Sci-Fi Holograms**: Avoid neon glows, cybernetic grids, and particle storms.
- ❌ **No Arbitrary 3D**: Do not tilt flat diagrams into isometric perspective unless 3D spatial depth is functionally required.

---

## 4. Brand Profile Integration (`brand_profile`)

Karve's visual identity is designed to be injected per mission rather than hardcoded globally:

### When `brand_profile` is ABSENT (Default / Experimental Mode)
- The Art Director has controlled creative freedom.
- Must establish a coherent local palette appropriate for the topic (e.g. paper/ink for algorithms, dark slate/neon for security, deep blue/emerald for cloud infrastructure).
- Must record the exact hex tokens in `creative-direction.json`.

### When `brand_profile` is PRESENT (Production Mode)
- The Art Director MUST consume and enforce the injected tokens:
  - `typography`: `font_family_latin`, `font_family_arabic`, `font_family_code`, scale clamps.
  - `colors`: `background`, `canvas_dark`, `text_primary`, `accent_primary`, `semantic_positive`, `semantic_negative`.
  - `radius`: `card`, `badge`, `pip`.
  - `safe_areas`: `caption_bottom_margin_px`, `host_exclusion_margin_px`.

*Note: The paper/ink museum palette (`#f5f5f5`, `#2d3142`, `#eb6c36`) from the database-index case study was an experimental choice and is NOT a global default.*
