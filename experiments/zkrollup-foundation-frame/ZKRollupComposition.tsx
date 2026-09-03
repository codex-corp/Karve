import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const ZKRollupComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // =========================================================================
  // ART DIRECTOR MOTION CHOREOGRAPHY (motion-design Precision Archetype)
  // =========================================================================

  // 1. Stage 1: Off-Chain Execution Dynamics
  const stage1Entrance = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 120 }
  });

  // Merkle Delta Flash (frames 20-45)
  const merkleDeltaOpacity = interpolate(frame, [20, 30, 45], [0.3, 1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // 2. Transition 1: R1CS Bezier Draw-In (frames 35-70)
  const r1csProgress = interpolate(frame, [35, 70], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // 3. Stage 2: Toroidal Prover Rotation & Crystal Materialization
  const toroidalRotation = (frame * 0.6) % 360;
  const proofSpring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, stiffness: 90 }
  });
  const proofScale = Math.max(0, proofSpring);
  const proofBloom = interpolate(frame, [70, 85, 100, 140], [0.2, 0.7, 0.4, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // 4. Transition 2: Calldata Emission Wavefront (frames 85-135)
  const wave1Radius = interpolate(frame, [85, 135], [20, 180], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const wave1Opacity = interpolate(frame, [85, 110, 135], [0.7, 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const calldataLineProgress = interpolate(frame, [95, 130], [0, 1], {
    easing: Easing.bezier(0.2, 0, 0, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // 5. Stage 3: L1 Pairing Check & Atomic Hexagon Commitment (frames 120-170)
  const l1Entrance = spring({
    frame: frame - 115,
    fps,
    config: { damping: 18, stiffness: 100 }
  });
  const pairingPulse = interpolate(frame, [130, 140, 155], [0, 1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const hexagonScale = spring({
    frame: frame - 135,
    fps,
    config: { damping: 20, stiffness: 140 }
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "oklch(0.92 0.015 264)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 90px",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "oklch(0.25 0.15 264)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Micro-Lattice with Golden Ratio Reference Line */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.4
        }}
      >
        <defs>
          <pattern id="zk-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="24" cy="24" r="0.8" fill="oklch(0.60 0.05 264)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zk-grid)" />

        {/* Golden Ratio Reference Axis: x = 1920 * 0.618 ≈ 1186px */}
        <line
          x1="1186"
          y1="40"
          x2="1186"
          y2="1040"
          stroke="oklch(0.70 0.05 264)"
          strokeWidth="0.75"
          strokeDasharray="2 6"
          opacity="0.5"
        />
        <text
          x="1194"
          y="70"
          fill="oklch(0.60 0.05 264)"
          fontSize="10"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.1em"
        >
          x = 1/φ (AXIS OF COMPACTION)
        </text>
      </svg>

      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "oklch(0.55 0.18 264)",
              marginBottom: 6
            }}
          >
            Zero-Knowledge Rollup Architecture
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: "oklch(0.20 0.15 264)"
            }}
          >
            Succinct Cryptographic State Verification & L1 Settlement
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "oklch(0.96 0.01 264)",
            padding: "8px 18px",
            borderRadius: 4,
            border: "1px solid oklch(0.86 0.02 264)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "oklch(0.75 0.18 45)",
                boxShadow: `0 0 ${12 * proofBloom}px oklch(0.75 0.18 45)`
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                color: "oklch(0.35 0.12 264)",
                letterSpacing: "0.08em"
              }}
            >
              CIRCUIT π: {frame >= 70 ? "VALIDATED" : "COMPILING"}
            </span>
          </div>
          <span style={{ color: "oklch(0.75 0.04 264)" }}>|</span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: "oklch(0.55 0.08 264)"
            }}
          >
            COMPRESSION RATIO: 1,024 : 1
          </span>
        </div>
      </div>

      {/* Main Visual Arena */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          position: "relative",
          margin: "30px 0",
          zIndex: 2
        }}
      >
        {/* SVG Connector & Animated Wave Layer */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1
          }}
        >
          <defs>
            <linearGradient id="lattice-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.35 0.18 280)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="oklch(0.75 0.18 45)" stopOpacity="1" />
              <stop offset="100%" stopColor="oklch(0.75 0.18 45)" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="settle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.75 0.18 45)" />
              <stop offset="50%" stopColor="oklch(0.55 0.22 264)" />
              <stop offset="100%" stopColor="oklch(0.60 0.15 100)" />
            </linearGradient>
          </defs>

          {/* Transition 1: Polynomial Convergence Curves (Animated Draw) */}
          <path
            d="M 390 200 C 480 200, 520 280, 590 280"
            fill="none"
            stroke="url(#lattice-grad)"
            strokeWidth="2"
            strokeDasharray="300"
            strokeDashoffset={300 * (1 - r1csProgress)}
            opacity="0.75"
          />
          <path
            d="M 390 240 C 470 240, 510 280, 590 280"
            fill="none"
            stroke="url(#lattice-grad)"
            strokeWidth="2"
            strokeDasharray="250"
            strokeDashoffset={250 * (1 - r1csProgress)}
            opacity="0.85"
          />
          <path
            d="M 390 280 L 590 280"
            fill="none"
            stroke="url(#lattice-grad)"
            strokeWidth="3"
            strokeDasharray="200"
            strokeDashoffset={200 * (1 - r1csProgress)}
          />
          <path
            d="M 390 320 C 470 320, 510 280, 590 280"
            fill="none"
            stroke="url(#lattice-grad)"
            strokeWidth="2"
            strokeDasharray="250"
            strokeDashoffset={250 * (1 - r1csProgress)}
            opacity="0.85"
          />
          <path
            d="M 390 360 C 480 360, 520 280, 590 280"
            fill="none"
            stroke="url(#lattice-grad)"
            strokeWidth="2"
            strokeDasharray="300"
            strokeDashoffset={300 * (1 - r1csProgress)}
            opacity="0.75"
          />

          <text
            x="480"
            y="265"
            textAnchor="middle"
            fill="oklch(0.60 0.15 45)"
            fontSize="11"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="0.12em"
            opacity={r1csProgress}
          >
            R1CS COMPRESSION
          </text>

          {/* Transition 2: Expanding Wavefront Circles */}
          {frame >= 85 && (
            <circle
              cx="830"
              cy="280"
              r={wave1Radius}
              fill="none"
              stroke="oklch(0.75 0.18 45)"
              strokeWidth="1.5"
              opacity={wave1Opacity}
            />
          )}

          {/* Calldata Emission Laser */}
          <line
            x1="870"
            y1="280"
            x2={870 + 370 * calldataLineProgress}
            y2="280"
            stroke="url(#settle-grad)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity={calldataLineProgress > 0 ? 1 : 0}
          />

          <text
            x="1050"
            y="265"
            textAnchor="middle"
            fill="oklch(0.50 0.18 264)"
            fontSize="11"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="0.14em"
            opacity={calldataLineProgress}
          >
            CALLEDATA DISPATCH (π, Δ_root)
          </text>
        </svg>

        {/* ========================================================================= */}
        {/* STAGE 1: Off-Chain Transaction Matrix */}
        {/* ========================================================================= */}
        <div
          style={{
            width: 380,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            opacity: stage1Entrance,
            transform: `scale(${0.92 + 0.08 * stage1Entrance})`
          }}
        >
          <div
            style={{
              backgroundColor: "oklch(0.96 0.01 264)",
              borderRadius: 6,
              border: "1px solid oklch(0.86 0.03 264)",
              boxShadow: "0 12px 30px -8px rgba(30, 41, 59, 0.06)",
              padding: "24px",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.35 0.18 280)" }} />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "oklch(0.35 0.18 280)",
                    letterSpacing: "0.08em"
                  }}
                >
                  L2 SEQUENCER BATCH
                </span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "oklch(0.55 0.06 264)" }}>
                #849202
              </span>
            </div>

            {/* 10x10 Transaction Micro-Grid Matrix with Breathing Animation */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: 5,
                padding: "16px 12px",
                background: "oklch(0.93 0.02 264)",
                borderRadius: 4,
                border: "1px solid oklch(0.88 0.03 264)"
              }}
            >
              {Array.from({ length: 100 }).map((_, i) => {
                const staggerDelay = (i % 10) * 2;
                const dotPulse = Math.sin((frame + staggerDelay) * 0.15) * 0.3 + 0.7;
                return (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor:
                        i === 42 || i === 73 || i === 18
                          ? "oklch(0.65 0.12 120)"
                          : i % 4 === 0
                          ? "oklch(0.35 0.18 280)"
                          : "oklch(0.50 0.12 280)",
                      opacity: dotPulse
                    }}
                  />
                );
              })}
            </div>

            {/* Merkle Delta */}
            <div
              style={{
                marginTop: 16,
                padding: "12px",
                background: "oklch(0.98 0.005 264)",
                borderRadius: 4,
                border: "1px solid oklch(0.90 0.02 264)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                opacity: merkleDeltaOpacity
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.45 0.10 264)", fontWeight: 600 }}>
                  Δ STATE MERKLE ROOT
                </span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.65 0.12 120)", fontWeight: 700 }}>
                  UPDATED
                </span>
              </div>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.55 0.08 264)" }}>
                0x3f8a...9c2d → 0x7e1b...4a89
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "oklch(0.20 0.15 264)" }}>
              1. Off-Chain Execution
            </div>
            <div style={{ fontSize: 12, color: "oklch(0.50 0.06 264)", marginTop: 2 }}>
              High-throughput aggregation & state transition
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 2: ZK Prover & Proof π */}
        {/* ========================================================================= */}
        <div
          style={{
            marginLeft: 170,
            width: 320,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `scale(${proofScale})`
          }}
        >
          <div style={{ width: 300, height: 320, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 280 280" width="280" height="280">
              <defs>
                <radialGradient id="crystal-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="oklch(0.85 0.20 45)" stopOpacity={proofBloom} />
                  <stop offset="70%" stopColor="oklch(0.75 0.18 45)" stopOpacity={proofBloom * 0.3} />
                  <stop offset="100%" stopColor="oklch(0.75 0.18 45)" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="140" cy="140" r="110" fill="url(#crystal-glow)" />

              {/* Rotating Toroidal Loops */}
              <g transform={`rotate(${toroidalRotation} 140 140)`}>
                <ellipse cx="140" cy="140" rx="95" ry="40" fill="none" stroke="oklch(0.75 0.18 45)" strokeWidth="1.5" transform="rotate(-30 140 140)" opacity="0.85" />
                <ellipse cx="140" cy="140" rx="95" ry="40" fill="none" stroke="oklch(0.75 0.18 45)" strokeWidth="1.5" transform="rotate(30 140 140)" opacity="0.85" />
                <ellipse cx="140" cy="140" rx="95" ry="40" fill="none" stroke="oklch(0.80 0.15 45)" strokeWidth="1" transform="rotate(90 140 140)" opacity="0.6" strokeDasharray="3 3" />
              </g>

              {/* Tetrahedral Crystalline Proof Geometry */}
              <polygon points="140,55 215,185 65,185" fill="oklch(0.96 0.05 45)" stroke="oklch(0.75 0.18 45)" strokeWidth="2" opacity="0.8" />
              <polygon points="140,55 140,185 65,185" fill="oklch(0.88 0.10 45)" stroke="oklch(0.70 0.18 45)" strokeWidth="1.5" opacity="0.6" />
              <polygon points="140,55 215,185 140,185" fill="oklch(0.82 0.12 45)" stroke="oklch(0.65 0.18 45)" strokeWidth="1.5" opacity="0.6" />
              <line x1="140" y1="55" x2="140" y2="225" stroke="oklch(0.75 0.18 45)" strokeWidth="1.5" strokeDasharray="2 2" />
              <polygon points="65,185 140,225 215,185" fill="oklch(0.70 0.15 45)" stroke="oklch(0.75 0.18 45)" strokeWidth="1.5" opacity="0.5" />

              <circle cx="140" cy="140" r="16" fill="oklch(0.98 0.01 264)" stroke="oklch(0.75 0.18 45)" strokeWidth="2" />
              <text x="140" y="146" textAnchor="middle" fill="oklch(0.35 0.18 45)" fontFamily="'JetBrains Mono', monospace" fontSize="18" fontWeight="800">
                π
              </text>
            </svg>
          </div>

          <div style={{ marginTop: 10, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "oklch(0.40 0.18 45)",
                letterSpacing: "0.1em"
              }}
            >
              2. PROVER & SNARK π
            </div>
            <div style={{ fontSize: 12, color: "oklch(0.50 0.06 264)", marginTop: 2 }}>
              Polynomial circuit compression (256-bit proof)
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 3: On-Chain L1 Settlement */}
        {/* ========================================================================= */}
        <div
          style={{
            marginLeft: "auto",
            width: 360,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: l1Entrance,
            transform: `scale(${0.9 + 0.1 * l1Entrance})`
          }}
        >
          <div
            style={{
              width: 340,
              backgroundColor: "oklch(0.96 0.01 264)",
              borderRadius: 6,
              border: "1px solid oklch(0.86 0.03 264)",
              boxShadow: "0 16px 36px -10px rgba(37, 99, 235, 0.08)",
              padding: "24px",
              boxSizing: "border-box"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.55 0.22 264)" }} />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "oklch(0.55 0.22 264)",
                    letterSpacing: "0.08em"
                  }}
                >
                  ETHEREUM L1 SETTLEMENT
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "oklch(0.90 0.05 100)",
                  color: "oklch(0.35 0.15 100)",
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontWeight: 700
                }}
              >
                O(1) VERIFIED
              </span>
            </div>

            {/* Cryptographic Pairing Check Diagram */}
            <div
              style={{
                background: "oklch(0.93 0.02 264)",
                padding: "16px",
                borderRadius: 4,
                border: "1px solid oklch(0.88 0.03 264)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12
              }}
            >
              <svg viewBox="0 0 160 120" width="160" height="120">
                <line x1="20" y1="60" x2="140" y2="60" stroke="oklch(0.55 0.22 264)" strokeWidth="1.5" strokeDasharray="3 3" opacity={pairingPulse > 0.5 ? 1 : 0.6} />
                <line x1="80" y1="10" x2="80" y2="110" stroke="oklch(0.60 0.15 100)" strokeWidth="1.5" strokeDasharray="3 3" opacity={pairingPulse > 0.5 ? 1 : 0.6} />

                <polygon
                  points="80,25 125,45 125,75 80,95 35,75 35,45"
                  fill="oklch(0.25 0.15 264)"
                  stroke="oklch(0.55 0.22 264)"
                  strokeWidth="2"
                  transform={`scale(${Math.max(0, hexagonScale)})`}
                  style={{ transformOrigin: "80px 60px" }}
                />

                <circle cx="80" cy="60" r="12" fill="oklch(0.60 0.15 100)" />
                <circle cx="80" cy="60" r="4" fill="oklch(0.98 0.01 264)" />
              </svg>

              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: "oklch(0.25 0.15 264)",
                  fontWeight: 700,
                  letterSpacing: "0.05em"
                }}
              >
                e(π_A, π_B) = e(π_C, G₂)
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                borderTop: "1px solid oklch(0.90 0.02 264)",
                paddingTop: 10,
                color: "oklch(0.50 0.08 264)"
              }}
            >
              <span>CANONICAL ROOT:</span>
              <span style={{ color: "oklch(0.35 0.15 100)", fontWeight: 700 }}>COMMITTED #19481</span>
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "oklch(0.20 0.15 264)" }}>
              3. On-Chain Settlement
            </div>
            <div style={{ fontSize: 12, color: "oklch(0.50 0.06 264)", marginTop: 2 }}>
              Constant-time pairing check & state finality
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid oklch(0.86 0.02 264)",
          paddingTop: 16,
          fontSize: 11,
          color: "oklch(0.50 0.06 264)",
          zIndex: 2
        }}
      >
        <div style={{ display: "flex", gap: 28, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>DISCIPLINE: <strong>GEOMETRIC SILENCE</strong></span>
          <span>CURVE: <strong>BN254 / ALT_BN128</strong></span>
          <span>MOTION ARCHETYPE: <strong>PRECISION (SPRING + BEZIER)</strong></span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          KARVE COMPLEX VISUAL SPECIFICATION
        </div>
      </div>
    </div>
  );
};
