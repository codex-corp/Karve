# Karve VideoShot — Remotion & Vector Implementation

This document governs **Stage F (Remotion Implementation)**. It defines the technical standards, component architecture, and mathematical constraints for rendering deterministic video graphics using Remotion.

---

## 1. Implementation Boundary & Authority Rules

The Remotion Implementer has **ZERO authority to casually redesign the approved visual concept**.

### Strict Constraint Protocol
If a specified layout, geometry, or animation proves technically difficult to implement:
1. **Preserve pedagogical intent**: The core mechanism must still be explained.
2. **Report the constraint**: State clearly why the exact spec encountered a barrier.
3. **Find an equivalent technical implementation**: Do NOT silently replace custom vector grammar with generic cards or standard HTML tables.

---

## 2. Deterministic Frame Timing (No Browser Clocks)

Remotion renders frames independently and often out of order (concurrency, headless Chromium). Any dependency on real-time browser clocks causes flickering, skipped frames, or broken renders.

### The Immutable Rules
- ✅ **ALWAYS use `useCurrentFrame()`**: The current integer frame number is the single source of truth for time.
- ✅ **ALWAYS use `interpolate()`**: Map frame ranges deterministically to visual values with explicit `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`.
- ✅ **ALWAYS use `Easing.bezier()`**: Use Remotion's mathematical easing functions.
- ❌ **NEVER use CSS `@keyframes` animations**: CSS animations rely on wall-clock time and will not render deterministically.
- ❌ **NEVER use `setTimeout` or `setInterval`**: Asynchronous timers will corrupt headless frame capture.
- ❌ **NEVER use `Math.random()` without a seed**: Unseeded randomness causes frame-to-frame jitter.

```typescript
// Correct Deterministic Remotion Interpolation
const progress = interpolate(frame, [150, 180], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
```

---

## 3. Precision Vector Geometry with SVG

Whenever a technical explainer requires lines, connectors, pointer rays, or geometric shapes, prefer inline SVG over HTML `<div>` borders.

### Why SVG is Required
1. **Arbitrary Angles**: HTML borders cannot cleanly connect two arbitrary $(X, Y)$ points across a layout.
2. **Path Drawing (`strokeDashoffset`)**: Dynamic vector rays or path trajectories require SVG `<path>` or `<line>` elements with parameterized dash offsets.
3. **Coordinate Precision**: An absolute SVG overlay spanning `1920x1080` allows mathematical coordinate calculations that match `visual-spec.json` pixel-for-pixel.

```tsx
// Example: Precision SVG Vector Beam / Connector
<svg
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: 1920,
    height: 1080,
    pointerEvents: "none",
    zIndex: 40
  }}
>
  <defs>
    <filter id="beam-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <path
    d={`M ${startX} ${startY} C ${startX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`}
    stroke={accentColor}
    strokeWidth={3}
    strokeDasharray={pathLength}
    strokeDashoffset={dashOffset}
    fill="none"
    filter="url(#beam-glow)"
  />
</svg>
```

---

## 4. Component Structure & Sandbox Discipline

All generated code belongs inside the project-local P7 sandbox (`projects/<id>/p7/`):
- `index.ts`: Composition registration using `registerRoot()`.
- `Root.tsx`: Defines `<Composition>` with exact width (`1920`), height (`1080`), fps (`30`), and duration in frames.
- `<ExplainerName>.tsx`: Pure functional React component containing the visual logic.
- Must compile with `npx tsc --noEmit` with zero errors or warnings before triggering a render.
