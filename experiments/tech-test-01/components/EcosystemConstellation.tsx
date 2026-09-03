import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface EcosystemConstellationProps {
  startFrame?: number;
  endFrame?: number;
  expansionFrame?: number;
  labelFrame?: number;
}

export const EcosystemConstellation: React.FC<EcosystemConstellationProps> = ({
  startFrame = 197,
  endFrame,
  expansionFrame = 277,
  labelFrame = 344,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const enterProgress = interpolate(frame, [startFrame - 15, startFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitProgress = endFrame
    ? interpolate(frame, [endFrame - 15, endFrame], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const totalOpacity = enterProgress * exitProgress;

  // Animation phases
  const expandProgress = Math.max(0, frame - expansionFrame);
  const labelProgress = Math.max(0, frame - labelFrame);

  // Position interpolation for WhatsApp hub movement (holds right then centers)
  const hubX = interpolate(
    frame,
    [startFrame, expansionFrame],
    [850, 600],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const hubY = 310;

  // Spring animation for hub scale on expansion
  const hubExpansionSpring = spring({
    fps,
    frame: expandProgress,
    config: { damping: 12, mass: 0.8, stiffness: 120 },
  });

  // Define satellite node positions in a radial arc around the hub (avoiding bottom-right PiP and bottom safe area)
  const satellites = [
    { id: 'tools', angle: -2.35, distance: 200, label: 'تطبيقات', delay: 0 },
    { id: 'integrations', angle: -1.57, distance: 190, label: 'تكاملات', delay: 6 },
    { id: 'workflows', angle: -0.78, distance: 210, label: 'إمكانيات', delay: 12 },
    { id: 'connect', angle: 3.14, distance: 230, label: 'اتصال', delay: 18 },
    { id: 'ecosystem', angle: 2.35, distance: 180, label: 'منظومة', delay: 24 },
  ];

  // Calculate animated positions and scales for satellites
  const animatedSatellites = satellites.map((sat) => {
    const progress = spring({
      fps,
      frame: Math.max(0, expandProgress - sat.delay),
      config: { damping: 14, mass: 0.8, stiffness: 130 },
    });

    return {
      ...sat,
      x: hubX + Math.cos(sat.angle) * sat.distance * progress,
      y: hubY + Math.sin(sat.angle) * sat.distance * progress,
      scale: progress,
      progress,
    };
  });

  // Micro-pulse animation for connectors
  const pulseOffset = Math.sin(frame * 0.15) * 1.5;

  // Label animation ("عالم كتير كبير")
  const labelOpacity = interpolate(labelProgress, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelScale = spring({
    fps,
    frame: labelProgress,
    config: { damping: 12, mass: 0.7, stiffness: 140 },
  });

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: totalOpacity, pointerEvents: 'none' }}>
      {/* Connector Lines (SVG layer underneath nodes) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 1,
        }}
        viewBox="0 0 1280 720"
      >
        {animatedSatellites.map((sat, i) => {
          const dx = sat.x - hubX;
          const dy = sat.y - hubY;
          const pathD = `M ${hubX} ${hubY} Q ${hubX + dx * 0.4} ${hubY + dy * 0.1 - 20}, ${sat.x} ${sat.y}`;
          const estLength = Math.sqrt(dx * dx + dy * dy);
          const dashOffset = (1 - sat.progress) * estLength;

          return (
            <path
              key={`line-${i}`}
              d={pathD}
              stroke="#00B3FF"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={`${estLength} ${estLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 ${4 + Math.max(0, pulseOffset)}px rgba(0, 179, 255, 0.7))`,
                opacity: sat.progress,
              }}
            />
          );
        })}
      </svg>

      {/* Central WhatsApp Hub */}
      <div
        style={{
          position: 'absolute',
          left: hubX - 38,
          top: hubY - 38,
          width: 76,
          height: 76,
          backgroundColor: '#25D366',
          borderRadius: 20,
          transform: `scale(${1 + hubExpansionSpring * 0.18})`,
          boxShadow: '0 0 28px rgba(37, 211, 102, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        <svg viewBox="0 0 24 24" width="46" height="46">
          <path
            fill="#FFFFFF"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      </div>

      {/* Satellite Nodes */}
      {animatedSatellites.map((sat) => (
        <div
          key={sat.id}
          style={{
            position: 'absolute',
            left: sat.x - 30,
            top: sat.y - 30,
            width: 60,
            height: 60,
            backgroundColor: 'rgba(26, 32, 44, 0.75)',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${sat.scale})`,
            opacity: sat.scale,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              backgroundColor: sat.id === 'tools' || sat.id === 'workflows' ? '#00B3FF' : '#7C4DFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(0, 179, 255, 0.5)',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
          </div>
          <span
            style={{
              marginTop: 4,
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'Noto Sans Arabic, sans-serif',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {sat.label}
          </span>
        </div>
      ))}

      {/* Constellation Header Label ("عالم كتير كبير") */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: `translateX(-50%) scale(${labelScale})`,
          opacity: labelOpacity,
          backgroundColor: 'rgba(26, 32, 44, 0.85)',
          borderRadius: 24,
          padding: '10px 24px',
          border: '1px solid rgba(0, 179, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 179, 255, 0.25)',
          backdropFilter: 'blur(12px)',
          fontSize: 22,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Noto Sans Arabic, sans-serif',
          direction: 'rtl',
          zIndex: 4,
        }}
      >
        عالم كتير كبير
      </div>
    </div>
  );
};

export default EcosystemConstellation;
