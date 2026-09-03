import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BlueprintMatrix } from './components/BlueprintMatrix.tsx';
import { ImmutableMonolith } from './components/ImmutableMonolith.tsx';
import { RuntimeBiosphere } from './components/RuntimeBiosphere.tsx';

export const DockerGenesisComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#080A0F',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Subtle Gradient & Grid Texture */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, rgba(20, 26, 38, 0.6) 0%, #080A0F 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle Ambient Vignette & Frame Grid Accent */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <line x1="60" y1="40" x2="1220" y2="40" stroke="#1E242D" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="60" y1="680" x2="1220" y2="680" stroke="#1E242D" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="60" y1="40" x2="60" y2="680" stroke="#1E242D" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="1220" y1="40" x2="1220" y2="680" stroke="#1E242D" strokeWidth="1" strokeOpacity="0.6" />
      </svg>

      {/* State 1: The Blueprint (Dockerfile) & Transition 1 (Build Compaction) */}
      <BlueprintMatrix startFrame={0} buildStartFrame={90} endFrame={135} />

      {/* State 2: The Immutable Monolith (Docker Image) & Transition 2 (Run Activation) */}
      <ImmutableMonolith startFrame={115} activationStartFrame={200} endFrame={240} />

      {/* State 3: The Living Instance (Docker Container) & Telemetry Loop */}
      <RuntimeBiosphere startFrame={220} endFrame={360} />
    </div>
  );
};

export default DockerGenesisComposition;
