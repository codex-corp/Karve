import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface EmbeddingPlatformSceneProps {
  startFrame?: number;
  endFrame?: number;
  corePulseInterval?: number;
  showLabels?: boolean;
}

export const EmbeddingPlatformScene: React.FC<EmbeddingPlatformSceneProps> = ({
  startFrame = 68,
  endFrame,
  corePulseInterval = 36,
  showLabels = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Visibility control: hidden until startFrame
  const visibilityProgress = interpolate(frame, [startFrame - 15, startFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const exitProgress = endFrame
    ? interpolate(frame, [endFrame - 15, endFrame], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const totalOpacity = visibilityProgress * exitProgress;

  // Spring-based entrance animation for core and nodes
  const entranceScale = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 10, mass: 0.5, stiffness: 100 },
  });

  // Core pulsing animation
  const corePulse = interpolate(
    (frame - startFrame) % corePulseInterval,
    [0, corePulseInterval / 2, corePulseInterval],
    [1, 1.08, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Connector animation: moving dash offset for energy pulse effect
  const dashOffset = interpolate(frame, [startFrame, startFrame + 180], [0, -300], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  });

  // Positions
  const centerX = 640;
  const centerY = 310;
  const nodeDistance = 210;

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: totalOpacity, pointerEvents: 'none' }}>
      {/* Central Embedding Core */}
      <div
        style={{
          position: 'absolute',
          left: centerX - 40,
          top: centerY - 40,
          width: 80,
          height: 80,
          backgroundColor: '#00B3FF',
          borderRadius: '50%',
          transform: `scale(${corePulse * entranceScale})`,
          boxShadow: '0 0 24px rgba(0, 179, 255, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
          }}
        />
      </div>

      {/* WhatsApp Node */}
      <div
        style={{
          position: 'absolute',
          left: centerX + nodeDistance - 32,
          top: centerY - 32,
          width: 64,
          height: 64,
          backgroundColor: '#25D366',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${entranceScale})`,
          boxShadow: '0 0 20px rgba(37, 211, 102, 0.45)',
          zIndex: 2,
        }}
      >
        <svg viewBox="0 0 24 24" width="38" height="38">
          <path
            fill="#FFFFFF"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
      </div>

      {/* Telegram Node */}
      <div
        style={{
          position: 'absolute',
          left: centerX - nodeDistance - 32,
          top: centerY - 32,
          width: 64,
          height: 64,
          backgroundColor: '#0088CC',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${entranceScale})`,
          boxShadow: '0 0 20px rgba(0, 136, 204, 0.45)',
          zIndex: 2,
        }}
      >
        <svg viewBox="0 0 24 24" width="38" height="38">
          <path
            fill="#FFFFFF"
            d="M12 0C5.377 0 0 5.377 0 12s5.377 12 12 12 12-5.377 12-12S18.623 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.603-5.053c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.96-.924c-.64-.203-.658-.64.136-.954l11.57-4.458c.538-.196 1.006.128.832.941z"
          />
        </svg>
      </div>

      {/* Connecting Curved Bezier Paths */}
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
        {/* Telegram to Core */}
        <path
          d={`M ${centerX - nodeDistance + 32} ${centerY} C ${centerX - nodeDistance + 100} ${centerY - 50}, ${centerX - 90} ${centerY - 50}, ${centerX - 40} ${centerY}`}
          stroke="#00B3FF"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="8,8"
          strokeDashoffset={dashOffset}
          style={{ filter: 'drop-shadow(0 0 6px rgba(0, 179, 255, 0.7))' }}
        />

        {/* Core to WhatsApp */}
        <path
          d={`M ${centerX + 40} ${centerY} C ${centerX + 90} ${centerY - 50}, ${centerX + nodeDistance - 100} ${centerY - 50}, ${centerX + nodeDistance - 32} ${centerY}`}
          stroke="#00B3FF"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="8,8"
          strokeDashoffset={-dashOffset}
          style={{ filter: 'drop-shadow(0 0 6px rgba(0, 179, 255, 0.7))' }}
        />
      </svg>

      {/* Labels */}
      {showLabels && (
        <>
          <div
            style={{
              position: 'absolute',
              left: centerX - 60,
              top: centerY + 54,
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: 'Inter, Noto Sans Arabic, sans-serif',
              textAlign: 'center',
              width: 120,
              transform: `scale(${entranceScale})`,
              letterSpacing: '0.5px',
            }}
          >
            تضمين
          </div>
          <div
            style={{
              position: 'absolute',
              left: centerX + nodeDistance - 60,
              top: centerY + 54,
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: 'Inter, Noto Sans Arabic, sans-serif',
              textAlign: 'center',
              width: 120,
              transform: `scale(${entranceScale})`,
              letterSpacing: '0.5px',
            }}
          >
            WhatsApp
          </div>
          <div
            style={{
              position: 'absolute',
              left: centerX - nodeDistance - 60,
              top: centerY + 54,
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: 'Inter, Noto Sans Arabic, sans-serif',
              textAlign: 'center',
              width: 120,
              transform: `scale(${entranceScale})`,
              letterSpacing: '0.5px',
            }}
          >
            Telegram
          </div>
        </>
      )}
    </div>
  );
};

export default EmbeddingPlatformScene;
