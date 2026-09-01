import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { PresentationPlan, RemappedVisualIntent } from "../../src/p6/types.ts";
import { ArabicCaptions } from "./ArabicCaptions.tsx";
import { VisualOverlays } from "./VisualOverlays.tsx";

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function activePunchScale(
  intents: RemappedVisualIntent[],
  timeSeconds: number,
  fps: number,
  scales: PresentationPlan["motion"]["punch_scale"]
): number {
  const active = intents
    .filter(
      (intent) =>
        intent.type === "punch_in" &&
        timeSeconds >= intent.output_start &&
        timeSeconds < intent.output_end
    )
    .sort((a, b) => b.confidence - a.confidence)[0];
  if (!active) {
    return 1;
  }

  const ramp = Math.max(5 / fps, 0.18);
  const enter = interpolate(
    timeSeconds,
    [active.output_start, active.output_start + ramp],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exit = interpolate(
    timeSeconds,
    [Math.max(active.output_start, active.output_end - ramp), active.output_end],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const progress = smoothstep(Math.min(enter, exit));
  const target = scales[active.intensity] || scales.normal;
  return 1 + (target - 1) * progress;
}

const NativeVideo: React.FC<{ plan: PresentationPlan; scale: number }> = ({
  plan,
  scale
}) => (
  <AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
    <OffthreadVideo
      src={staticFile(plan.media.file)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale})`,
        transformOrigin: "50% 45%"
      }}
    />
  </AbsoluteFill>
);

const ContainBlurVideo: React.FC<{ plan: PresentationPlan; scale: number }> = ({
  plan,
  scale
}) => (
  <AbsoluteFill style={{ backgroundColor: "#05070B", overflow: "hidden" }}>
    <OffthreadVideo
      muted
      src={staticFile(plan.media.file)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter: "blur(42px) brightness(0.42) saturate(0.9)",
        transform: "scale(1.15)"
      }}
    />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <OffthreadVideo
        src={staticFile(plan.media.file)}
        style={{
          width: `${plan.media.foreground_max_width * 100}%`,
          height: `${plan.media.foreground_max_height * 100}%`,
          objectFit: "contain",
          borderRadius: Math.min(plan.motion.border_radius, 24),
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
          transform: `scale(${scale})`,
          transformOrigin: "50% 45%"
        }}
      />
    </AbsoluteFill>
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.24) 100%)"
      }}
    />
  </AbsoluteFill>
);

export const KarveP6Composition: React.FC<PresentationPlan> = (plan) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punchIntents = useMemo(
    () => plan.visual_intents.filter((intent) => intent.type === "punch_in"),
    [plan.visual_intents]
  );
  const scale = activePunchScale(
    punchIntents,
    frame / fps,
    fps,
    plan.motion.punch_scale
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {plan.media.layout === "contain_blur" ? (
        <ContainBlurVideo plan={plan} scale={scale} />
      ) : (
        <NativeVideo plan={plan} scale={scale} />
      )}
      <VisualOverlays plan={plan} />
      <ArabicCaptions plan={plan} />
    </AbsoluteFill>
  );
};
