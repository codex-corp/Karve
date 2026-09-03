import React from "react";

export const DockerFoundationComposition: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "oklch(0.98 0.005 264)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 80px",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "oklch(0.30 0.15 264)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Micro-Grid & Subtle Structure */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.35
        }}
      >
        <defs>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="0.75" fill="oklch(0.70 0.05 264)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Header: Minimal, museum-grade anchor */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "oklch(0.55 0.12 264)",
              marginBottom: 6
            }}
          >
            Docker Foundation Flow
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: "oklch(0.20 0.12 264)"
            }}
          >
            Deterministic Build & Runtime Architecture
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "oklch(0.94 0.02 264)",
            padding: "6px 14px",
            borderRadius: 20,
            border: "1px solid oklch(0.90 0.03 264)"
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "oklch(0.80 0.20 130)",
              boxShadow: "0 0 8px oklch(0.80 0.20 130)"
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500,
              color: "oklch(0.40 0.10 264)"
            }}
          >
            SPECIFICATION v1.0
          </span>
        </div>
      </div>

      {/* Main Diagram Canvas */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          margin: "40px 0",
          zIndex: 2
        }}
      >
        {/* SVG Connector Layer */}
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
            <marker id="arrow-commit" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 0 1 L 7 4 L 0 7 z" fill="oklch(0.60 0.18 264)" />
            </marker>
            <marker id="arrow-run" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M 0 1 L 7 4 L 0 7 z" fill="oklch(0.80 0.20 130)" />
            </marker>
            <linearGradient id="build-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.45 0.12 264)" />
              <stop offset="100%" stopColor="oklch(0.60 0.18 264)" />
            </linearGradient>
            <linearGradient id="run-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.60 0.18 264)" />
              <stop offset="100%" stopColor="oklch(0.80 0.20 130)" />
            </linearGradient>
          </defs>

          {/* Build Connector: Stepped 3-segment mechanical path */}
          {/* Segment 1: Parsing (Dotted ↘) */}
          <path
            d="M 380 240 L 460 280"
            fill="none"
            stroke="oklch(0.45 0.12 264)"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
          {/* Segment 2: Layering (Solid 8px bar ──) */}
          <path
            d="M 460 280 L 620 280"
            fill="none"
            stroke="url(#build-grad)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Cache Layer Dots on the bar */}
          <circle cx="500" cy="280" r="5" fill="oklch(0.98 0.005 264)" />
          <circle cx="540" cy="280" r="5" fill="oklch(0.98 0.005 264)" />
          <circle cx="580" cy="280" r="5" fill="oklch(0.98 0.005 264)" />
          {/* Segment 3: Commit (Solid ↗) */}
          <path
            d="M 620 280 L 700 240"
            fill="none"
            stroke="oklch(0.60 0.18 264)"
            strokeWidth="3.5"
            markerEnd="url(#arrow-commit)"
          />

          {/* BUILD Label */}
          <text
            x="540"
            y="320"
            textAnchor="middle"
            fill="oklch(0.50 0.12 264)"
            fontSize="14"
            fontWeight="600"
            letterSpacing="0.15em"
          >
            BUILD (COMPACT)
          </text>

          {/* Run Connector: Ballistic Arc (↗) with Ignition Burst */}
          <path
            d="M 1060 230 Q 1180 120 1300 220"
            fill="none"
            stroke="url(#run-grad)"
            strokeWidth="3.5"
            markerEnd="url(#arrow-run)"
          />
          {/* 8-Ray Radial Ignition Burst at Arc Apex */}
          <g transform="translate(1180, 150)">
            <circle cx="0" cy="0" r="4" fill="oklch(0.80 0.20 130)" />
            <line x1="0" y1="-12" x2="0" y2="-6" stroke="oklch(0.80 0.20 130)" strokeWidth="2" />
            <line x1="0" y1="6" x2="0" y2="12" stroke="oklch(0.80 0.20 130)" strokeWidth="2" />
            <line x1="-12" y1="0" x2="-6" y2="0" stroke="oklch(0.80 0.20 130)" strokeWidth="2" />
            <line x1="6" y1="0" x2="12" y2="0" stroke="oklch(0.80 0.20 130)" strokeWidth="2" />
            <line x1="-8" y1="-8" x2="-4" y2="-4" stroke="oklch(0.80 0.20 130)" strokeWidth="1.5" />
            <line x1="4" y1="4" x2="8" y2="8" stroke="oklch(0.80 0.20 130)" strokeWidth="1.5" />
            <line x1="8" y1="-8" x2="4" y2="-4" stroke="oklch(0.80 0.20 130)" strokeWidth="1.5" />
            <line x1="-4" y1="4" x2="-8" y2="8" stroke="oklch(0.80 0.20 130)" strokeWidth="1.5" />
          </g>
          {/* RUN Label */}
          <text
            x="1180"
            y="125"
            textAnchor="middle"
            fill="oklch(0.70 0.20 130)"
            fontSize="14"
            fontWeight="600"
            letterSpacing="0.15em"
          >
            RUN (INSTANTIATE)
          </text>
        </svg>

        {/* ZONE 1: Dockerfile (25% Width) */}
        <div
          style={{
            width: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 3
          }}
        >
          {/* The Document Rectangle with Clipped Corners & Striations */}
          <div
            style={{
              width: "100%",
              height: 380,
              backgroundColor: "oklch(0.94 0.03 264)",
              borderRadius: "4px 24px 4px 4px",
              border: "1px solid oklch(0.88 0.04 264)",
              boxShadow: "0 16px 32px -8px rgba(37, 99, 235, 0.08)",
              padding: "24px 20px",
              boxSizing: "border-box",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            {/* Header / Meta */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.80 0.05 264)" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.80 0.05 264)" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.80 0.05 264)" }} />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "oklch(0.55 0.10 264)",
                  fontWeight: 600
                }}
              >
                Dockerfile
              </span>
            </div>

            {/* Horizontal Line Striations (8px rhythm background) */}
            <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ height: 2, background: "oklch(0.90 0.03 264)", width: "90%" }} />
              <div style={{ height: 2, background: "oklch(0.90 0.03 264)", width: "75%" }} />
              <div style={{ height: 2, background: "oklch(0.90 0.03 264)", width: "85%" }} />
              <div style={{ height: 2, background: "oklch(0.90 0.03 264)", width: "60%" }} />
            </div>

            {/* Monospace Code Lines */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                lineHeight: "1.8",
                color: "oklch(0.40 0.15 264)",
                background: "oklch(0.97 0.01 264)",
                padding: "16px 14px",
                borderRadius: 4,
                border: "1px solid oklch(0.91 0.02 264)"
              }}
            >
              <div>
                <span style={{ color: "oklch(0.55 0.20 264)", fontWeight: 700 }}>FROM</span> node:18-alpine
              </div>
              <div>
                <span style={{ color: "oklch(0.55 0.20 264)", fontWeight: 700 }}>COPY</span> . /app
              </div>
              <div>
                <span style={{ color: "oklch(0.55 0.20 264)", fontWeight: 700 }}>CMD</span> ["node", "server.js"]
              </div>
            </div>

            {/* Bottom State Label */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: "oklch(0.60 0.08 264)",
                borderTop: "1px solid oklch(0.90 0.03 264)",
                paddingTop: 10
              }}
            >
              <span>SOURCE SPEC</span>
              <span>128 B</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: 600,
              color: "oklch(0.25 0.12 264)",
              letterSpacing: "-0.01em"
            }}
          >
            1. Source Definition
          </div>
          <div style={{ fontSize: 13, color: "oklch(0.55 0.08 264)", marginTop: 4 }}>
            Immutable recipe & build steps
          </div>
        </div>

        {/* ZONE 2: Docker Image (30% Width - Main Center Visual Mass) */}
        <div
          style={{
            width: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 3
          }}
        >
          {/* Isometric Faceted Cube */}
          <div style={{ width: 340, height: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 320 320" width="320" height="320">
              <defs>
                <linearGradient id="top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.72 0.15 264)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.18 264)" />
                </linearGradient>
                <linearGradient id="left-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.60 0.18 264)" />
                  <stop offset="100%" stopColor="oklch(0.50 0.18 264)" />
                </linearGradient>
                <linearGradient id="right-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.55 0.18 264)" />
                  <stop offset="100%" stopColor="oklch(0.42 0.18 264)" />
                </linearGradient>
                <pattern id="hex-mesh" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 10 0 L 20 5 L 20 15 L 10 20 L 0 15 L 0 5 Z"
                    fill="none"
                    stroke="oklch(0.90 0.10 264)"
                    strokeWidth="0.75"
                    opacity="0.4"
                  />
                </pattern>
              </defs>

              {/* Isometric Top Face (Hex Mesh Pattern) */}
              <polygon points="160,40 280,100 160,160 40,100" fill="url(#top-grad)" />
              <polygon points="160,40 280,100 160,160 40,100" fill="url(#hex-mesh)" opacity="0.6" />

              {/* Cryptographic Root Anchor on Top */}
              <circle cx="160" cy="100" r="12" fill="oklch(0.85 0.12 264)" opacity="0.9" />
              <circle cx="160" cy="100" r="4" fill="oklch(0.40 0.18 264)" />

              {/* Left Face: Terminal Build Prompt */}
              <polygon points="40,100 160,160 160,280 40,220" fill="url(#left-grad)" />
              <g transform="translate(50, 160) skewY(26.5) scale(0.7)">
                <text fill="oklch(0.90 0.05 264)" fontFamily="'JetBrains Mono', monospace" fontSize="13">
                  $ docker build
                </text>
                <text
                  y="20"
                  fill="oklch(0.80 0.08 264)"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="11"
                  opacity="0.8"
                >
                  sha256:8f4b1...
                </text>
                <text
                  y="40"
                  fill="oklch(0.75 0.10 264)"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="11"
                  opacity="0.7"
                >
                  3 layers merged
                </text>
              </g>

              {/* Right Face: Version & Artifact Metadata */}
              <polygon points="160,160 280,100 280,220 160,280" fill="url(#right-grad)" />
              <g transform="translate(180, 215) skewY(-26.5) scale(0.75)">
                <text fill="oklch(0.95 0.03 264)" fontFamily="'JetBrains Mono', monospace" fontSize="18" fontWeight="700">
                  myapp:v1.0
                </text>
                <text
                  y="24"
                  fill="oklch(0.80 0.05 264)"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="12"
                  opacity="0.85"
                >
                  IMMUTABLE ARTIFACT
                </text>
              </g>

              {/* Wireframe Outline */}
              <path
                d="M 160 40 L 280 100 L 280 220 L 160 280 L 40 220 L 40 100 Z M 160 40 L 160 160 L 280 100 M 160 160 L 40 100 M 160 160 L 160 280"
                fill="none"
                stroke="oklch(0.95 0.02 264)"
                strokeWidth="1.5"
                opacity="0.5"
              />
            </svg>
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: 600,
              color: "oklch(0.25 0.12 264)",
              letterSpacing: "-0.01em"
            }}
          >
            2. Immutable Image
          </div>
          <div style={{ fontSize: 13, color: "oklch(0.55 0.08 264)", marginTop: 4 }}>
            Layered, cryptographic snapshot
          </div>
        </div>

        {/* ZONE 3: Docker Container (25% Width - Dynamic Capsule) */}
        <div
          style={{
            width: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 3
          }}
        >
          {/* Rounded Capsule with Live Green Status Strip & Dot Matrix */}
          <div
            style={{
              width: "100%",
              height: 380,
              backgroundColor: "oklch(0.94 0.03 264)",
              borderRadius: 32,
              border: "1px solid oklch(0.88 0.04 264)",
              boxShadow: "0 20px 40px -10px rgba(22, 163, 74, 0.12)",
              padding: "24px 20px",
              boxSizing: "border-box",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            {/* Top Live Status Bar (4px height in pulsing vibrant green) */}
            <div>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: "oklch(0.80 0.20 130)",
                  borderRadius: 2,
                  boxShadow: "0 0 10px oklch(0.80 0.20 130)"
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "oklch(0.80 0.20 130)"
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: "oklch(0.40 0.15 130)",
                      fontWeight: 700
                    }}
                  >
                    STATE: RUNNING
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "oklch(0.55 0.08 264)"
                  }}
                >
                  PID: 4082
                </span>
              </div>
            </div>

            {/* Micro-Grid of 64 Active Process Dots (8x8 Grid) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 8,
                padding: "20px 14px",
                background: "oklch(0.97 0.01 264)",
                borderRadius: 16,
                border: "1px solid oklch(0.90 0.02 264)"
              }}
            >
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor:
                      i % 7 === 0 || i % 11 === 0
                        ? "oklch(0.75 0.20 130)"
                        : i % 3 === 0
                        ? "oklch(0.60 0.18 264)"
                        : "oklch(0.88 0.02 264)",
                    boxShadow:
                      i % 7 === 0
                        ? "0 0 6px oklch(0.75 0.20 130)"
                        : "none"
                  }}
                />
              ))}
            </div>

            {/* Bottom Runtime Telemetry */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "oklch(0.50 0.08 264)",
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid oklch(0.90 0.03 264)",
                paddingTop: 10
              }}
            >
              <span>PORT: 8080:80</span>
              <span style={{ color: "oklch(0.40 0.15 130)", fontWeight: 600 }}>MEM: 24.8 MB</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: 600,
              color: "oklch(0.25 0.12 264)",
              letterSpacing: "-0.01em"
            }}
          >
            3. Running Container
          </div>
          <div style={{ fontSize: 13, color: "oklch(0.55 0.08 264)", marginTop: 4 }}>
            Isolated, stateful execution unit
          </div>
        </div>
      </div>

      {/* Footer: Philosophy & Verification Stamp */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid oklch(0.90 0.02 264)",
          paddingTop: 18,
          fontSize: 12,
          color: "oklch(0.55 0.06 264)",
          zIndex: 2
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <span>PHILOSOPHY: <strong>GEOMETRIC SILENCE</strong></span>
          <span>COLOR SPACE: <strong>OKLCH UNIFORM</strong></span>
          <span>RATIO: <strong>16:9 NATIVE</strong></span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          KARVE VISUAL QUALITY EXPERIMENT (UI-STYLING)
        </div>
      </div>
    </div>
  );
};
