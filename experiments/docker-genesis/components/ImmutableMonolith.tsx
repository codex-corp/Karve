import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface ImmutableMonolithProps {
  startFrame?: number;
  activationStartFrame?: number;
  endFrame?: number;
}

export const ImmutableMonolith: React.FC<ImmutableMonolithProps> = ({
  startFrame = 110,
  activationStartFrame = 200,
  endFrame = 240,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  // === ENTRY ANIMATION (110–135) ===
  const arrivalProgress = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 12, stiffness: 150, mass: 1 },
  });

  const scale = interpolate(arrivalProgress, [0, 1], [0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shockwave ring expansion (only during entry phase)
  const shockwaveOpacity = interpolate(frame, [startFrame, startFrame + 25], [0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shockwaveScale = interpolate(frame, [startFrame, startFrame + 25], [0.8, 3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // === STATIC STATE PULSE (135–200) ===
  const pulsePhase = (frame - (startFrame + 25)) % 120;
  const pulseIntensity = interpolate(
    pulsePhase,
    [0, 30, 60, 90, 120],
    [0.3, 1, 0.3, 1, 0.3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // === ACTIVATION TRANSITION (200–240) ===
  const activationProgress = interpolate(frame, [activationStartFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(activationProgress, [0, 1], [0, -40]);
  const dissolveOpacity = interpolate(activationProgress, [0, 1], [1, 0]);
  const coreGlowIntensity = interpolate(activationProgress, [0, 1], [0.4, 1.4]);

  // Hexagon path generator
  const hexWidth = 220;
  const hexHeight = 340;
  const strataCount = 7;
  const strataHeight = hexHeight / strataCount;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#8A95A7',
          fontFamily: "'Inter', monospace, sans-serif",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '4px',
          opacity: interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }) * dissolveOpacity,
        }}
      >
        DOCKER IMAGE // IMMUTABLE MONOLITH
      </div>

      {/* Shockwave Ring */}
      {frame >= startFrame && frame <= startFrame + 25 && (
        <div
          style={{
            position: 'absolute',
            left: width / 2,
            top: height / 2,
            transform: `translate(-50%, -50%) scale(${shockwaveScale})`,
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: `2px solid rgba(160, 216, 255, ${shockwaveOpacity})`,
            opacity: shockwaveOpacity,
          }}
        />
      )}

      {/* Monolith Container */}
      <div
        style={{
          position: 'absolute',
          left: width / 2,
          top: height / 2,
          transform: `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`,
          opacity: dissolveOpacity,
        }}
      >
        <svg width={hexWidth} height={hexHeight} viewBox="-110 -170 220 340">
          {/* Strata Layers */}
          {Array.from({ length: strataCount }).map((_, i) => {
            const y = i * strataHeight - 170;
            const isEven = i % 2 === 0;
            const fillColor = isEven ? '#1E242D' : '#5CB3FF';
            const pulseEffect = isEven ? 0 : pulseIntensity * 0.2;

            return (
              <g key={i}>
                {/* Stratum Block */}
                <rect
                  x="-95"
                  y={y}
                  width="190"
                  height={strataHeight - 3}
                  rx="6"
                  fill={fillColor}
                  stroke="rgba(160, 216, 255, 0.3)"
                  strokeWidth="1"
                  style={{
                    filter:
                      activationProgress > 0
                        ? `drop-shadow(0 0 ${12 * coreGlowIntensity}px #00E0A1)`
                        : `drop-shadow(0 0 ${4 + 6 * pulseEffect}px rgba(92, 179, 255, 0.4))`,
                  }}
                />

                {/* Inner Crystalline Vein */}
                {isEven && (
                  <line
                    x1="-70"
                    y1={y + strataHeight / 2}
                    x2="70"
                    y2={y + strataHeight / 2}
                    stroke="#A0D8FF"
                    strokeWidth="1.5"
                    strokeDasharray="8 4"
                    opacity={0.7 + pulseEffect}
                    style={{
                      filter:
                        activationProgress > 0
                          ? `drop-shadow(0 0 ${8 * coreGlowIntensity}px #00E0A1)`
                          : `drop-shadow(0 0 5px #A0D8FF)`,
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Cryptographic Hash Watermark */}
          <text
            x="0"
            y="155"
            textAnchor="middle"
            fill="#8A95A7"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="2px"
            opacity="0.5"
          >
            SHA256:7F3A9C8D2E14...
          </text>
        </svg>
      </div>
    </div>
  );
};

export default ImmutableMonolith;
