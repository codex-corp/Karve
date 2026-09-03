import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface RuntimeBiosphereProps {
  startFrame?: number;
  endFrame?: number;
}

export const RuntimeBiosphere: React.FC<RuntimeBiosphereProps> = ({
  startFrame = 220,
  endFrame = 360,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Normalize local frame within this component's timeline
  const localFrame = frame - startFrame;
  const isActive = frame >= startFrame && frame <= endFrame;

  if (!isActive) return null;

  // === CORE ANIMATION TIMING ===

  // Core ignition (frames 0–30)
  const coreScale = spring({
    fps,
    frame: localFrame,
    config: { damping: 10, mass: 0.5, stiffness: 100 },
  });
  const coreOpacity = interpolate(localFrame, [0, 10, 30], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shockwave effect (frames 5–25)
  const shockwaveProgress = interpolate(localFrame, [5, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shockwaveRadius = interpolate(shockwaveProgress, [0, 1], [0, 380]);
  const shockwaveOpacity = interpolate(shockwaveProgress, [0, 0.8, 1], [0.8, 0.4, 0]);

  // Faraday cage appears (frames 20–50)
  const cageOpacity = interpolate(localFrame, [20, 35, 50], [0, 0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cageRotation = interpolate(localFrame, [0, 360], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // === HEARTBEAT PULSE LOOP (every 36 frames) ===
  const heartbeatCycle = localFrame % 36;
  const heartbeatScale = interpolate(
    heartbeatCycle,
    [0, 6, 12, 18],
    [1, 1.06, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // === DATA CONDUITS AND PULSES ===
  const conduitPaths = [
    { id: 'top-left', x1: 640, y1: 360, x2: 140, y2: 160 },
    { id: 'top-right', x1: 640, y1: 360, x2: 1140, y2: 160 },
    { id: 'bottom-left', x1: 640, y1: 360, x2: 140, y2: 580 },
    { id: 'bottom-right', x1: 640, y1: 360, x2: 1140, y2: 580 },
  ];

  // Telemetry labels
  const telemetryData = [
    { label: 'CPU:', value: '12%', position: { x: 140, y: 120 } },
    { label: 'MEM:', value: '256MB', position: { x: width - 260, y: 120 } },
    { label: 'ISOLATION:', value: 'ACTIVE', position: { x: 140, y: height - 120 } },
    { label: 'RUNTIME:', value: 'RUNNING', position: { x: width - 260, y: height - 120 } },
  ];

  // Hexagon points generator
  const getHexagonPoints = (centerX: number, centerY: number, radius: number, rotation: number) => {
    const angleStep = Math.PI / 3;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = rotation + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

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
          opacity: interpolate(localFrame, [10, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        DOCKER CONTAINER // LIVING INSTANCE
      </div>

      {/* Shockwave */}
      {shockwaveRadius > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 640 - shockwaveRadius,
            top: 360 - shockwaveRadius,
            width: shockwaveRadius * 2,
            height: shockwaveRadius * 2,
            borderRadius: '50%',
            border: `2px solid #00FFC2`,
            opacity: shockwaveOpacity,
          }}
        />
      )}

      {/* Plasma Core */}
      <div
        style={{
          position: 'absolute',
          left: 640 - 90,
          top: 360 - 90,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, #00FFC2 0%, #00E0A1 60%, #08382E 100%)`,
          transform: `scale(${coreScale * heartbeatScale})`,
          opacity: coreOpacity,
          boxShadow: `0 0 50px rgba(0, 255, 194, 0.6), 0 0 100px rgba(0, 224, 161, 0.3)`,
        }}
      />

      {/* Faraday Cage */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <polygon
          points={getHexagonPoints(640, 360, 140, (cageRotation * Math.PI) / 180)}
          fill="none"
          stroke="#8A95A7"
          strokeWidth="2"
          strokeDasharray="6,6"
          opacity={cageOpacity}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(138, 149, 167, 0.5))',
          }}
        />
      </svg>

      {/* Data Conduits */}
      {conduitPaths.map((path) => {
        const length = Math.sqrt(
          Math.pow(path.x2 - path.x1, 2) + Math.pow(path.y2 - path.y1, 2)
        );
        const angle = Math.atan2(path.y2 - path.y1, path.x2 - path.x1) * (180 / Math.PI);

        // Pulse animation (loop every 45 frames)
        const pulseOffset = (localFrame * 3) % (length * 2);
        const pulsePosition = pulseOffset > length ? 2 * length - pulseOffset : pulseOffset;

        return (
          <div key={path.id}>
            {/* Curved Path Visualization */}
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <path
                d={`M ${path.x1} ${path.y1} Q ${(path.x1 + path.x2) / 2} ${
                  (path.y1 + path.y2) / 2 - 40
                } ${path.x2} ${path.y2}`}
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2"
                opacity={0.6 * cageOpacity}
              />
            </svg>

            {/* Traveling Pulse Dot */}
            <div
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#FF6B35',
                boxShadow: '0 0 10px #FF6B35',
                left: path.x1 - 4,
                top: path.y1 - 4,
                opacity: cageOpacity,
                transform: `
                  translate(
                    ${Math.cos((angle * Math.PI) / 180) * pulsePosition}px,
                    ${Math.sin((angle * Math.PI) / 180) * pulsePosition}px
                  )
                `,
              }}
            />
          </div>
        );
      })}

      {/* Telemetry HUD Labels */}
      {telemetryData.map((item, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: item.position.x,
            top: item.position.y,
            color: '#8A95A7',
            fontFamily: "'Inter', monospace, sans-serif",
            fontSize: '14px',
            letterSpacing: '2px',
            opacity: interpolate(localFrame, [35, 55], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            background: 'rgba(26, 32, 44, 0.75)',
            border: '1px solid rgba(0, 224, 161, 0.25)',
            padding: '6px 14px',
            borderRadius: 6,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>{item.label}</span> <span style={{ color: '#00FFC2', fontWeight: 700 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default RuntimeBiosphere;
