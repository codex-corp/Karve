import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export interface ValueAccentBadgeProps {
  enterStartFrame?: number;
  exitEndFrame?: number;
}

export const ValueAccentBadge: React.FC<ValueAccentBadgeProps> = ({
  enterStartFrame = 459,
  exitEndFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timing
  const progress = Math.max(0, frame - enterStartFrame);
  
  // Spring animations
  const yMotion = spring({
    fps,
    frame: progress,
    config: { damping: 10, mass: 0.5, stiffness: 100 },
  });
  const scaleMotion = spring({
    fps,
    frame: progress,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
  });

  const translateY = 30 * (1 - yMotion);
  const scale = 0.85 + 0.15 * scaleMotion;

  const exitProgress = exitEndFrame
    ? interpolate(frame, [exitEndFrame - 15, exitEndFrame], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const enterOpacity = interpolate(frame, [enterStartFrame, enterStartFrame + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const totalOpacity = enterOpacity * exitProgress;

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        left: 56,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity: totalOpacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 28px',
        borderRadius: '50px',
        background: 'rgba(26, 32, 44, 0.88)',
        border: '1px solid rgba(0, 179, 255, 0.35)',
        boxShadow: '0 0 24px rgba(0, 179, 255, 0.3)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      {/* Upward Trend Icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginLeft: 10 }}>
        <path
          d="M4 16 L10 10 L14 14 L20 6"
          stroke="#00B3FF"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="6" r="3" fill="#7C4DFF" />
      </svg>

      {/* Arabic Text */}
      <span
        style={{
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif",
          direction: 'rtl',
        }}
      >
        أفضل وأفضل
      </span>
    </div>
  );
};

export default ValueAccentBadge;
