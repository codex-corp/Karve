import React from "react";
import { Composition } from "remotion";
import { DockerFoundationComposition } from "./DockerFoundationComposition.tsx";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DockerFoundationStill"
      component={DockerFoundationComposition}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
