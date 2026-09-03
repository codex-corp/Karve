import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

// Palette & Style Tokens from visual-spec.json
const PALETTE = {
  paper: "#f5f5f5",
  ink: "#2d3142",
  muted: "#4f5d75",
  accent: "#eb6c36",
  accentTint: "rgba(235, 108, 54, 0.12)",
  rule: "rgba(45, 49, 66, 0.15)",
  ruleSolid: "#bfc0c0",
  success: "#2a9d8f",
  warning: "#e76f51",
  white: "#ffffff",
  dimmed: "rgba(45, 49, 66, 0.22)",
};

// Physically UNORDERED heap storage rows (Crucial semantic truth: raw table heap is unsorted)
const TABLE_ROWS = [
  { id: 42, label: "42" },
  { id: 9,  label: "09" },
  { id: 23, label: "23" },
  { id: 89, label: "89" },
  { id: 15, label: "15" },
  { id: 93, label: "93" },
  { id: 4,  label: "04" },
  { id: 71, label: "71" },
  { id: 55, label: "55" },
  { id: 31, label: "31" },
  { id: 77, label: "77" }, // TARGET ROW (Index 10)
  { id: 99, label: "99" },
  { id: 48, label: "48" },
  { id: 82, label: "82" },
  { id: 97, label: "97" },
  { id: 63, label: "63" },
];

const TARGET_ROW_INDEX = 10;

export const DbIndexExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // ---------------------------------------------------------------------------
  // TIMING / BEATS (0 - 900 frames @ 30 FPS)
  // Beat 1: 0   - 135 (0.0s - 4.5s)  Problem / Unindexed Query
  // Beat 2: 135 - 315 (4.5s - 10.5s) Inefficient Full Table Scan
  // Beat 3: 315 - 450 (10.5s - 15s)  Introduce Sorted B-Tree Index
  // Beat 4: 450 - 630 (15.0s - 21s)  Logarithmic Search Narrowing
  // Beat 5: 630 - 765 (21.0s - 25.5s)Direct Pointer Ray to Row
  // Beat 6: 765 - 835 (25.5s - 27.8s)Performance Contrast (O(N) vs O(log N))
  // Beat 7: 835 - 900 (27.8s - 30s)  Engineering Trade-offs
  // ---------------------------------------------------------------------------

  // Table Geometry
  const cardWidth = 74;
  const cardHeight = 66;
  const cardGap = 14;
  const totalTableWidth = TABLE_ROWS.length * cardWidth + (TABLE_ROWS.length - 1) * cardGap;
  const tableStartX = (width - totalTableWidth) / 2;
  const tableY = 720;

  // Banner animations
  const bannerOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const bannerY = interpolate(frame, [0, 25], [25, 45], {
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
    extrapolateRight: "clamp",
  });

  // Table entry animation
  const tableOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateRight: "clamp" });

  // ---------------------------------------------------------------------------
  // BEAT 2: SCAN POINTER (frames 140 - 305)
  // ---------------------------------------------------------------------------
  const scanProgress = interpolate(frame, [140, 300], [0, TARGET_ROW_INDEX], {
    easing: Easing.linear,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentScannedIndex = Math.min(Math.floor(scanProgress), TARGET_ROW_INDEX);

  const scanPointerOpacity = interpolate(
    frame,
    [135, 145, 308, 318],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const scanPointerX = tableStartX + scanProgress * (cardWidth + cardGap) + cardWidth / 2;

  // ---------------------------------------------------------------------------
  // BEAT 3, 4, 5: B-TREE ENTRANCE & FADE OUT AT BEAT 6
  // ---------------------------------------------------------------------------
  const btreeOpacity = interpolate(
    frame,
    [315, 355, 760, 775],
    [0, 1, 1, 0], // Cleanly fades out before contrast card enters!
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const btreeSlideY = interpolate(frame, [315, 360], [25, 0], {
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Search Step States in B-Tree
  const rootActive = frame >= 440;
  const l1RightActive = frame >= 500;
  const leaf4Active = frame >= 560;

  // Branch elimination opacities
  const leftSubtreeOpacity = interpolate(frame, [475, 505], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leaf3Opacity = interpolate(frame, [530, 560], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---------------------------------------------------------------------------
  // BEAT 5: DIRECT POINTER BEAM (frames 630 - 765)
  // ---------------------------------------------------------------------------
  const pointerBeamProgress = interpolate(frame, [635, 675], [0, 1], {
    easing: Easing.bezier(0.2, 0, 0, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pointerBeamOpacity = interpolate(
    frame,
    [630, 640, 755, 765],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const targetRowHighlight = interpolate(frame, [670, 700], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---------------------------------------------------------------------------
  // BEAT 6: PERFORMANCE CONTRAST OVERLAY (frames 765 - 835)
  // ---------------------------------------------------------------------------
  const contrastOpacity = interpolate(frame, [765, 785], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contrastScale = interpolate(frame, [765, 790], [0.96, 1], {
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---------------------------------------------------------------------------
  // BEAT 7: TRADEOFF FOOTER BANNER (frames 835 - 900)
  // ---------------------------------------------------------------------------
  const tradeoffOpacity = interpolate(frame, [835, 855], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tradeoffY = interpolate(frame, [835, 860], [30, 0], {
    easing: Easing.bezier(0.05, 0.7, 0.1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Coordinates for B-Tree nodes
  const rootNode = { x: 960, y: 195 + btreeSlideY, w: 150, h: 54 };
  const l1Left = { x: 640, y: 315 + btreeSlideY, w: 130, h: 50 };
  const l1Right = { x: 1280, y: 315 + btreeSlideY, w: 130, h: 50 };

  const leaves = [
    { id: "leaf1", x: 470, y: 435 + btreeSlideY, w: 124, h: 48, keys: "04 | 15" },
    { id: "leaf2", x: 730, y: 435 + btreeSlideY, w: 124, h: 48, keys: "23 | 31" },
    { id: "leaf3", x: 1130, y: 435 + btreeSlideY, w: 124, h: 48, keys: "42 | 55" },
    { id: "leaf4", x: 1390, y: 435 + btreeSlideY, w: 136, h: 48, keys: "71 | 77 | 89" },
  ];

  // Target Row Coordinates (Row #11, value 77)
  const targetRowX = tableStartX + TARGET_ROW_INDEX * (cardWidth + cardGap) + cardWidth / 2;
  const targetRowY = tableY;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: PALETTE.paper,
        color: PALETTE.ink,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Architectural Coordinate Grid */}
      <svg
        width="1920"
        height="1080"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0.4,
          pointerEvents: "none",
        }}
      >
        <defs>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={PALETTE.rule} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {/* ===================================================================== */}
      {/* TOP BANNER: SQL QUERY HUD */}
      {/* ===================================================================== */}
      <div
        style={{
          position: "absolute",
          top: bannerY,
          left: 320,
          width: 1280,
          height: 64,
          opacity: bannerOpacity,
          backgroundColor: PALETTE.white,
          border: `1.5px solid ${PALETTE.ink}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          boxShadow: "0 4px 12px rgba(45, 49, 66, 0.05)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              fontSize: 13,
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: 4,
              backgroundColor: PALETTE.accentTint,
              color: PALETTE.accent,
              letterSpacing: 0.8,
            }}
          >
            QUERY
          </span>
          <span
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              fontSize: 22,
              fontWeight: 600,
              color: PALETTE.ink,
              letterSpacing: -0.2,
            }}
          >
            SELECT * FROM users WHERE id = <span style={{ color: PALETTE.accent, fontWeight: 800 }}>77</span>;
          </span>
        </div>

        {/* Dynamic State Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {frame < 315 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: frame >= 135 ? PALETTE.warning : PALETTE.muted,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: frame >= 135 ? PALETTE.warning : PALETTE.muted,
                }}
              />
              {frame >= 135 ? "FULL TABLE SCAN • O(N)" : "HEAP SCAN • NO INDEX"}
            </div>
          )}

          {frame >= 315 && frame < 765 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: PALETTE.accent,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.accent,
                }}
              />
              INDEX SEARCH • O(log N)
            </div>
          )}

          {frame >= 765 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: PALETTE.success,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.success,
                }}
              />
              LOOKUP COMPLETE
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BEAT 1 & 2: CENTER CONCEPT CARD (Frames 0 - 315) */}
      {/* Solves empty center space problem and explains heap storage truth */}
      {/* ===================================================================== */}
      {frame < 315 && (
        <div
          style={{
            position: "absolute",
            top: 260,
            left: 320,
            width: 1280,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: interpolate(frame, [15, 35, 305, 315], [0, 1, 1, 0]),
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 20,
              backgroundColor: "rgba(45, 49, 66, 0.06)",
              fontSize: 13,
              fontWeight: 700,
              color: PALETTE.muted,
              letterSpacing: 0.6,
              marginBottom: 12,
            }}
          >
            PHYSICAL STORAGE ARCHITECTURE
          </div>

          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: PALETTE.ink,
              margin: "0 0 10px 0",
              textAlign: "center",
            }}
          >
            {frame < 140
              ? "Without an index, data rows are stored in arbitrary heap order."
              : "Finding ID 77 requires inspecting disk blocks one by one."}
          </h2>

          <p
            style={{
              fontSize: 16,
              color: PALETTE.muted,
              margin: 0,
              maxWidth: 760,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {frame < 140
              ? "Database tables have no inherent sorted order. The query engine cannot jump directly to a record without an auxiliary search structure."
              : "Every row inspected costs CPU and disk I/O. On a 10,000,000 row table, this full scan takes seconds or minutes."}
          </p>

          {/* Dynamic Row Inspection Live Indicator */}
          {frame >= 140 && (
            <div
              style={{
                marginTop: 26,
                padding: "10px 22px",
                borderRadius: 8,
                backgroundColor: PALETTE.white,
                border: `1.5px solid ${PALETTE.warning}`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 4px 14px rgba(231, 111, 81, 0.12)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.warning }}>
                CURRENT INSPECTION:
              </div>
              <div
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  color: PALETTE.ink,
                }}
              >
                Row #{currentScannedIndex + 1} (ID: {TABLE_ROWS[currentScannedIndex].label})
                {TABLE_ROWS[currentScannedIndex].id === 77 ? (
                  <span style={{ color: PALETTE.success, marginLeft: 10 }}>
                    == 77 ✓ (FOUND AT STEP 11!)
                  </span>
                ) : (
                  <span style={{ color: PALETTE.warning, marginLeft: 10 }}>
                    ≠ 77 (MISMATCH, READ NEXT ROW)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* B-TREE INDEX (Frames 315 - 765) */}
      {/* ===================================================================== */}
      {frame >= 315 && frame < 775 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: btreeOpacity,
            pointerEvents: "none",
          }}
        >
          {/* Index Section Title */}
          <div
            style={{
              position: "absolute",
              top: 130 + btreeSlideY,
              left: 320,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 12,
                fontWeight: 800,
                color: PALETTE.accent,
                backgroundColor: PALETTE.accentTint,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              SEPARATE SEARCH STRUCTURE
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: PALETTE.muted }}>
              Sorted B-Tree Index on <strong style={{ color: PALETTE.ink }}>users(id)</strong>
            </span>
          </div>

          {/* SVG Connectors between B-Tree Nodes */}
          <svg width="1920" height="1080" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Root -> L1-Left (Eliminated Path) */}
            <line
              x1={rootNode.x - 30}
              y1={rootNode.y + rootNode.h}
              x2={l1Left.x}
              y2={l1Left.y}
              stroke={PALETTE.ink}
              strokeWidth={1.5}
              opacity={leftSubtreeOpacity * 0.4}
              strokeDasharray={leftSubtreeOpacity < 0.5 ? "4 4" : "none"}
            />
            {/* Root -> L1-Right (Active Path: 77 > 50) */}
            <line
              x1={rootNode.x + 30}
              y1={rootNode.y + rootNode.h}
              x2={l1Right.x}
              y2={l1Right.y}
              stroke={rootActive ? PALETTE.accent : PALETTE.ink}
              strokeWidth={rootActive ? 3.5 : 1.5}
              opacity={rootActive ? 1 : 0.4}
            />

            {/* L1-Left -> Leaves (dimmed) */}
            <line
              x1={l1Left.x - 20}
              y1={l1Left.y + l1Left.h}
              x2={leaves[0].x}
              y2={leaves[0].y}
              stroke={PALETTE.ink}
              strokeWidth={1.5}
              opacity={leftSubtreeOpacity * 0.3}
            />
            <line
              x1={l1Left.x + 20}
              y1={l1Left.y + l1Left.h}
              x2={leaves[1].x}
              y2={leaves[1].y}
              stroke={PALETTE.ink}
              strokeWidth={1.5}
              opacity={leftSubtreeOpacity * 0.3}
            />

            {/* L1-Right -> Leaf3 (42, 55) (Eliminated when 77 > 75) */}
            <line
              x1={l1Right.x - 20}
              y1={l1Right.y + l1Right.h}
              x2={leaves[2].x}
              y2={leaves[2].y}
              stroke={PALETTE.ink}
              strokeWidth={1.5}
              opacity={leaf3Opacity * 0.4}
              strokeDasharray={leaf3Opacity < 0.5 ? "4 4" : "none"}
            />
            {/* L1-Right -> Leaf4 (Active Path: 77 in leaf4) */}
            <line
              x1={l1Right.x + 20}
              y1={l1Right.y + l1Right.h}
              x2={leaves[3].x}
              y2={leaves[3].y}
              stroke={l1RightActive ? PALETTE.accent : PALETTE.ink}
              strokeWidth={l1RightActive ? 3.5 : 1.5}
              opacity={l1RightActive ? 1 : 0.4}
            />
          </svg>

          {/* Root Node: [ 50 ] */}
          <div
            style={{
              position: "absolute",
              left: rootNode.x - rootNode.w / 2,
              top: rootNode.y,
              width: rootNode.w,
              height: rootNode.h,
              backgroundColor: PALETTE.white,
              border: `2px solid ${rootActive ? PALETTE.accent : PALETTE.ink}`,
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: rootActive ? "0 0 20px rgba(235, 108, 54, 0.2)" : "none",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: 0.5 }}>
              ROOT PIVOT
            </div>
            <div
              style={{
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 20,
                fontWeight: 700,
                color: rootActive ? PALETTE.accent : PALETTE.ink,
              }}
            >
              [ 50 ]
            </div>
          </div>

          {/* Decision 1 Callout Badge (frames 450 - 520) */}
          {frame >= 450 && frame < 525 && (
            <div
              style={{
                position: "absolute",
                left: rootNode.x + 95,
                top: rootNode.y + 10,
                backgroundColor: PALETTE.ink,
                color: PALETTE.white,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              77 &gt; 50 → DISCARD LEFT HALF
            </div>
          )}

          {/* Level 1 Left: [ 25 ] (Eliminated) */}
          <div
            style={{
              position: "absolute",
              left: l1Left.x - l1Left.w / 2,
              top: l1Left.y,
              width: l1Left.w,
              height: l1Left.h,
              backgroundColor: PALETTE.white,
              border: `1.5px solid ${PALETTE.ruleSolid}`,
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: leftSubtreeOpacity,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: PALETTE.muted }}>KEY &lt; 50</div>
            <div style={{ fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 18, fontWeight: 700, color: PALETTE.muted }}>
              [ 25 ]
            </div>
            {leftSubtreeOpacity < 0.5 && (
              <span
                style={{
                  position: "absolute",
                  bottom: -20,
                  fontSize: 10,
                  fontWeight: 800,
                  color: PALETTE.warning,
                  letterSpacing: 0.5,
                }}
              >
                50% SEARCH ELIMINATED
              </span>
            )}
          </div>

          {/* Level 1 Right: [ 75 ] (Active) */}
          <div
            style={{
              position: "absolute",
              left: l1Right.x - l1Right.w / 2,
              top: l1Right.y,
              width: l1Right.w,
              height: l1Right.h,
              backgroundColor: PALETTE.white,
              border: `2px solid ${l1RightActive ? PALETTE.accent : PALETTE.ink}`,
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: l1RightActive ? "0 0 20px rgba(235, 108, 54, 0.2)" : "none",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: PALETTE.muted }}>KEY ≥ 50</div>
            <div
              style={{
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 18,
                fontWeight: 700,
                color: l1RightActive ? PALETTE.accent : PALETTE.ink,
              }}
            >
              [ 75 ]
            </div>
          </div>

          {/* Decision 2 Callout Badge (frames 510 - 580) */}
          {frame >= 510 && frame < 580 && (
            <div
              style={{
                position: "absolute",
                left: l1Right.x + 85,
                top: l1Right.y + 10,
                backgroundColor: PALETTE.ink,
                color: PALETTE.white,
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              77 &gt; 75 → LEAF [71 | 77 | 89]
            </div>
          )}

          {/* Leaves */}
          {leaves.map((leaf, i) => {
            const isTargetLeaf = leaf.id === "leaf4";
            const leafOpacity = i < 2 ? leftSubtreeOpacity : i === 2 ? leaf3Opacity : 1;
            const isLeafActive = isTargetLeaf && leaf4Active;

            return (
              <div
                key={leaf.id}
                style={{
                  position: "absolute",
                  left: leaf.x - leaf.w / 2,
                  top: leaf.y,
                  width: leaf.w,
                  height: leaf.h,
                  backgroundColor: PALETTE.white,
                  border: `2px solid ${isLeafActive ? PALETTE.accent : PALETTE.ruleSolid}`,
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: leafOpacity,
                  boxShadow: isLeafActive ? "0 0 20px rgba(235, 108, 54, 0.25)" : "none",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: PALETTE.muted, letterSpacing: 0.5 }}>
                  {isTargetLeaf ? "TARGET LEAF" : "LEAF"}
                </div>
                <div
                  style={{
                    fontFamily: 'ui-monospace, "SF Mono", monospace',
                    fontSize: 15,
                    fontWeight: 700,
                    color: PALETTE.ink,
                  }}
                >
                  {isTargetLeaf ? (
                    <>
                      71 | <span style={{ color: PALETTE.accent, textDecoration: "underline" }}>77</span> | 89
                    </>
                  ) : (
                    leaf.keys
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIRECT POINTER BEAM (Frames 630 - 765) */}
      {/* ===================================================================== */}
      {frame >= 630 && frame < 765 && (
        <svg
          width="1920"
          height="1080"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: pointerBeamOpacity,
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          <defs>
            <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={PALETTE.accent} />
              <stop offset="100%" stopColor={PALETTE.success} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {(() => {
            // Leaf 4 key 77 coordinate
            const startX = 1390;
            const startY = 435 + 48; // Leaf 4 bottom
            const endX = targetRowX;
            const endY = targetRowY; // Row 77 top

            const currentEndY = startY + (endY - startY) * pointerBeamProgress;
            const currentEndX = startX + (endX - startX) * pointerBeamProgress;

            return (
              <g>
                <path
                  d={`M ${startX} ${startY} C ${startX} ${startY + 90}, ${endX} ${endY - 90}, ${currentEndX} ${currentEndY}`}
                  fill="none"
                  stroke="url(#beamGradient)"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                  filter="url(#glow)"
                />
                {pointerBeamProgress >= 0.98 && (
                  <circle cx={endX} cy={endY} r="6" fill={PALETTE.success} />
                )}
              </g>
            );
          })()}
        </svg>
      )}

      {/* Pointer Explanation Badge */}
      {frame >= 645 && frame < 765 && (
        <div
          style={{
            position: "absolute",
            left: 1220,
            top: 555,
            backgroundColor: PALETTE.ink,
            color: PALETTE.white,
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: PALETTE.accent }}>✦</span>
          <span>Index Leaf contains RowID Pointer → Direct Jump to Row 77</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DATABASE TABLE (PHYSICAL STORAGE HEAP) */}
      {/* ===================================================================== */}
      <div
        style={{
          position: "absolute",
          top: tableY - 40,
          left: 0,
          width: "100%",
          opacity: tableOpacity,
        }}
      >
        {/* Table Section Label */}
        <div
          style={{
            position: "absolute",
            left: tableStartX,
            top: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              fontSize: 12,
              fontWeight: 800,
              color: PALETTE.muted,
              backgroundColor: "rgba(45, 49, 66, 0.08)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            TABLE HEAP
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.muted }}>
            Physical Storage: <strong style={{ color: PALETTE.ink }}>users</strong> table (Unsorted Data Pages on Disk)
          </span>
        </div>

        {/* Storage Rail line */}
        <div
          style={{
            position: "absolute",
            top: 36 + cardHeight + 4,
            left: tableStartX - 20,
            width: totalTableWidth + 40,
            height: 2,
            backgroundColor: PALETTE.rule,
          }}
        />

        {/* Row Cards */}
        {TABLE_ROWS.map((row, index) => {
          const isTarget = index === TARGET_ROW_INDEX;
          const isCurrentlyScanned =
            frame >= 140 && frame < 315 && currentScannedIndex === index;
          const isPassedInScan =
            frame >= 140 && frame < 315 && index < currentScannedIndex;

          const isMatched = isTarget && frame >= 670;

          // Compute card styling
          let borderColor = PALETTE.ruleSolid;
          let borderWidth = 1.5;
          let bgColor = PALETTE.white;
          let scale = 1;
          let shadow = "0 2px 4px rgba(45,49,66,0.04)";

          if (isCurrentlyScanned) {
            borderColor = PALETTE.warning;
            borderWidth = 2.5;
            bgColor = "rgba(231, 111, 81, 0.08)";
            scale = 1.06;
            shadow = "0 4px 14px rgba(231, 111, 81, 0.25)";
          } else if (isMatched) {
            borderColor = PALETTE.success;
            borderWidth = 3;
            bgColor = "rgba(42, 157, 143, 0.12)";
            scale = 1.08;
            shadow = "0 6px 20px rgba(42, 157, 143, 0.35)";
          } else if (isPassedInScan) {
            borderColor = PALETTE.muted;
          }

          const cardX = tableStartX + index * (cardWidth + cardGap);
          const cardY = 36;

          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: cardX,
                top: cardY,
                width: cardWidth,
                height: cardHeight,
                backgroundColor: bgColor,
                border: `${borderWidth}px solid ${borderColor}`,
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${scale})`,
                boxShadow: shadow,
                transition: "transform 0.15s ease, border-color 0.15s ease",
                zIndex: isMatched || isCurrentlyScanned ? 30 : 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isMatched ? PALETTE.success : PALETTE.muted,
                  letterSpacing: 0.5,
                }}
              >
                ROW #{index + 1}
              </div>
              <div
                style={{
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                  fontSize: 20,
                  fontWeight: 800,
                  color: isMatched ? PALETTE.success : isCurrentlyScanned ? PALETTE.warning : PALETTE.ink,
                }}
              >
                {row.label}
              </div>

              {isMatched && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -22,
                    fontSize: 10,
                    fontWeight: 800,
                    color: PALETTE.success,
                    letterSpacing: 0.6,
                    whiteSpace: "nowrap",
                  }}
                >
                  ✓ MATCH
                </div>
              )}
            </div>
          );
        })}

        {/* Scan Reticle Pointer */}
        {frame >= 140 && frame < 315 && (
          <div
            style={{
              position: "absolute",
              left: scanPointerX - 16,
              top: 18,
              width: 32,
              height: 32,
              opacity: scanPointerOpacity,
              pointerEvents: "none",
              zIndex: 35,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <polygon points="16,28 8,8 24,8" fill={PALETTE.warning} />
            </svg>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SCAN COUNTER HUD (Frames 135 - 315) */}
      {/* ===================================================================== */}
      {frame >= 135 && frame < 315 && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 320,
            width: 1280,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 28px",
            backgroundColor: PALETTE.white,
            border: `1.5px solid ${PALETTE.ruleSolid}`,
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.warning, letterSpacing: 0.8 }}>
              UNINDEXED FULL SCAN IN PROGRESS
            </div>
            <div style={{ fontSize: 15, color: PALETTE.ink, marginTop: 2 }}>
              Iterating physical storage blocks sequentially...
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 13, color: PALETTE.muted, marginRight: 10 }}>
              BLOCKS INSPECTED:
            </span>
            <span
              style={{
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 28,
                fontWeight: 800,
                color: PALETTE.warning,
              }}
            >
              {currentScannedIndex + 1}
            </span>
            <span style={{ fontSize: 16, color: PALETTE.muted }}> / 16 (linear growth O(N))</span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BEAT 6: PERFORMANCE CONTRAST OVERLAY (Frames 765 - 835) */}
      {/* ===================================================================== */}
      {frame >= 765 && (
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 320,
            width: 1280,
            height: 390,
            opacity: contrastOpacity,
            transform: `scale(${contrastScale})`,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: `2px solid ${PALETTE.ink}`,
            borderRadius: 12,
            boxShadow: "0 16px 36px rgba(45,49,66,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "0 40px",
            zIndex: 70,
          }}
        >
          {/* Unindexed Side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px",
              borderRight: `1.5px dashed ${PALETTE.ruleSolid}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: PALETTE.warning, letterSpacing: 1 }}>
              WITHOUT INDEX
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, color: PALETTE.ink, margin: "8px 0" }}>
              O(N)
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: PALETTE.muted, textAlign: "center" }}>
              Full Table Scan (Sequential Search)
            </div>
            <div
              style={{
                marginTop: 18,
                padding: "8px 18px",
                backgroundColor: "rgba(231, 111, 81, 0.1)",
                borderRadius: 6,
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 15,
                fontWeight: 700,
                color: PALETTE.warning,
              }}
            >
              1,000,000 rows = 1,000,000 disk checks
            </div>
          </div>

          {/* VS Divider Badge */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: PALETTE.ink,
              color: PALETTE.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
              margin: "0 24px",
            }}
          >
            VS
          </div>

          {/* Indexed Side */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: PALETTE.success, letterSpacing: 1 }}>
              WITH B-TREE INDEX
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, color: PALETTE.accent, margin: "8px 0" }}>
              O(log N)
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: PALETTE.muted, textAlign: "center" }}>
              B-Tree Search + Direct Pointer Hop
            </div>
            <div
              style={{
                marginTop: 18,
                padding: "8px 18px",
                backgroundColor: "rgba(42, 157, 143, 0.12)",
                borderRadius: 6,
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                fontSize: 15,
                fontWeight: 700,
                color: PALETTE.success,
              }}
            >
              1,000,000 rows ≈ 20 node hops!
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BEAT 7: TRADEOFF FOOTER BANNER (Frames 835 - 900) */}
      {/* ===================================================================== */}
      {frame >= 835 && (
        <div
          style={{
            position: "absolute",
            bottom: 35 + tradeoffY,
            left: 320,
            width: 1280,
            opacity: tradeoffOpacity,
            backgroundColor: PALETTE.ink,
            color: PALETTE.white,
            padding: "16px 28px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            zIndex: 80,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                backgroundColor: PALETTE.accent,
                color: PALETTE.white,
                fontWeight: 800,
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 4,
                letterSpacing: 0.8,
              }}
            >
              ENGINEERING TRADE-OFF
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Indexes provide logarithmic reads, but require deliberate maintenance:
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontSize: 14, color: "#e0e0e0" }}>
              💾 <strong>Storage:</strong> +20–40% disk space
            </span>
            <span style={{ fontSize: 14, color: "#e0e0e0" }}>
              ✍️ <strong>Writes:</strong> Tree rebalancing overhead
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
