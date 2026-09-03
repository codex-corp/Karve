import React from "react";
import { Composition } from "remotion";
import { DbIndexExplainer } from "./DbIndexExplainer.tsx";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DbIndexExplainer"
        component={DbIndexExplainer}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
