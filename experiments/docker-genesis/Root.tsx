import React from 'react';
import { Composition } from 'remotion';
import { DockerGenesisComposition } from './DockerGenesisComposition.tsx';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DockerGenesis"
      component={DockerGenesisComposition}
      durationInFrames={360}
      fps={30}
      width={1280}
      height={720}
    />
  );
};

export default RemotionRoot;
