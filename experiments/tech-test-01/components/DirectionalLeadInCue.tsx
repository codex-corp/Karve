import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export interface DirectionalLeadInCueProps {
  startFrame?: number;
  endFrame?: number;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

export const DirectionalLeadInCue: React.FC<DirectionalLeadInCueProps> = ({
  startFrame = 500,
  endFrame = 560,
  startPoint = { x: 920, y: 110 },
  endPoint = { x: 1210, y: 110 },
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  // Animate stroke dash offset
  const progress = interpolate(frame, [startFrame, startFrame + 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(frame, [endFrame - 10, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pathLength = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
  );

  const dashArray = `${pathLength}`;
  const dashOffset = pathLength * (1 - progress);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: fadeOut,
        zIndex: 25,
      }}
    >
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Tracer Path */}
        <path
          d={`M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`}
          stroke="#00B3FF"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(0, 179, 255, 0.85))',
          }}
        />

        {/* Directional Chevron at head */}
        <g
          transform={`translate(${endPoint.x - 12}, ${endPoint.y - 10})`}
          style={{ opacity: progress > 0.4 ? (progress - 0.4) * 1.66 : 0 }}
        >
          <path
            d="M0 0 L10 10 L0 20"
            stroke="#00B3FF"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0, 179, 255, 0.85))',
            }}
          />
        </g>
      </svg>

      {/* Directional Pill Badge */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          right: 56,
          transform: `scale(${0.9 + 0.1 * progress})`,
          opacity: progress,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 24px',
          borderRadius: 30,
          background: 'rgba(26, 32, 44, 0.88)',
          border: '1px solid rgba(0, 179, 255, 0.4)',
          boxShadow: '0 0 20px rgba(0, 179, 255, 0.35)',
          backdropFilter: 'blur(10px)',
          direction: 'rtl',
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif",
          }}
        >
          عرض توضيحي مباشر
        </span>
        <span style={{ color: '#00B3FF', fontSize: 22, fontWeight: 700 }}>➔</span>
      </div>
    </div>
  );
};

export default DirectionalLeadInCue;
