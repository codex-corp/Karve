import React from "react";
import { Composition } from "remotion";
import { ZKRollupComposition } from "./ZKRollupComposition.tsx";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ZKRollupStill"
      component={ZKRollupComposition}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
