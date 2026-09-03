import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { PresentationPlan, RemappedVisualIntent } from "../../src/p6/types.ts";
import { ArabicCaptions } from "../../remotion/components/ArabicCaptions.tsx";
import { VisualOverlays } from "../../remotion/components/VisualOverlays.tsx";
import { HostLayer } from "./components/HostLayer.tsx";
import { EmbeddingPlatformScene } from "./components/EmbeddingPlatformScene.tsx";
import { EcosystemConstellation } from "./components/EcosystemConstellation.tsx";
import { ValueAccentBadge } from "./components/ValueAccentBadge.tsx";
import { DirectionalLeadInCue } from "./components/DirectionalLeadInCue.tsx";

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

export const P6CComposition: React.FC<PresentationPlan> = (plan) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSeconds = frame / fps;

  const punchScale = useMemo(
    () =>
      activePunchScale(
        plan.visual_intents || [],
        timeSeconds,
        fps,
        plan.motion.punch_scale
      ),
    [plan.visual_intents, plan.motion.punch_scale, timeSeconds, fps]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* 1. Base Host Layer (supports continuous playback + host-shrink-to-chip) */}
      <HostLayer plan={plan} punchScale={punchScale} />

      {/* 2. Visual Direction Layer: Beat 1 Platform Embedding Announcement (14.68s -> 19.40s) */}
      <EmbeddingPlatformScene
        startFrame={Math.round(14.68 * fps)}
        endFrame={Math.round(19.40 * fps)}
      />

      {/* 3. Visual Direction Layer: Beat 2 Ecosystem Constellation (19.40s -> 24.96s) */}
      <EcosystemConstellation
        startFrame={Math.round(19.40 * fps)}
        endFrame={Math.round(24.96 * fps)}
        expansionFrame={Math.round(21.80 * fps)}
        labelFrame={Math.round(24.30 * fps)}
      />

      {/* 4. Visual Direction Layer: Beat 3 Forward-Looking Value Badge (28.12s -> 29.50s) */}
      <ValueAccentBadge
        enterStartFrame={Math.round(28.12 * fps)}
        exitEndFrame={Math.round(29.50 * fps)}
      />

      {/* 5. Visual Direction Layer: Beat 4 Live Demo Lead-In Cue (30.60s -> 31.92s) */}
      <DirectionalLeadInCue
        startFrame={Math.round(30.60 * fps)}
        endFrame={Math.round(31.92 * fps)}
      />

      {/* 6. Canonical Karve Visual Overlays (Title / Callout Cards) */}
      <VisualOverlays plan={plan} />

      {/* 7. Canonical Karve Arabic Captions (Top layer with 100% fidelity) */}
      <ArabicCaptions plan={plan} />
    </AbsoluteFill>
  );
};
