import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { PresentationPlan } from "../../src/p6/types.ts";

/**
 * HostLayer with rounded-rectangle PiP behavior.
 *
 * Rules:
 *   - Outside [14.68s, 24.96s]: Host is full-frame primary anchor.
 *   - 14.68s -> 15.08s (0.4s): Smooth transition from full-frame to bottom-right rounded-rectangle PiP (320x180, 16:9 ratio).
 *   - 15.08s -> 24.96s: Host holds in the PiP position (continuous video playback, no freeze).
 *   - 24.96s -> 25.36s (0.4s): Smooth transition back to full-frame.
 */
export const HostLayer: React.FC<{
  plan: PresentationPlan;
  punchScale: number;
}> = ({ plan, punchScale }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSeconds = frame / fps;

  // Keyframes for PiP state (in seconds)
  const shrinkStart = 14.68;
  const shrinkDuration = 0.4;
  const restoreStart = 24.96;
  const restoreDuration = 0.4;

  // Compute shrink progress: 0 = full-frame, 1 = PiP
  let pipProgress = 0;
  if (timeSeconds >= shrinkStart && timeSeconds < shrinkStart + shrinkDuration) {
    pipProgress = interpolate(
      timeSeconds,
      [shrinkStart, shrinkStart + shrinkDuration],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (timeSeconds >= shrinkStart + shrinkDuration && timeSeconds < restoreStart) {
    pipProgress = 1;
  } else if (timeSeconds >= restoreStart && timeSeconds < restoreStart + restoreDuration) {
    pipProgress = interpolate(
      timeSeconds,
      [restoreStart, restoreStart + restoreDuration],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  // Smooth cubic-bezier-like easing
  const eased = pipProgress * pipProgress * (3 - 2 * pipProgress);

  // Target PiP dimensions in 1280x720 canvas (16:9 aspect ratio)
  const pipWidth = 320;
  const pipHeight = 180;
  const pipMarginRight = 48;
  const pipMarginBottom = 48;
  const targetBorderRadius = 18;

  // Interpolated geometry
  const currentWidth = interpolate(eased, [0, 1], [width, pipWidth]);
  const currentHeight = interpolate(eased, [0, 1], [height, pipHeight]);
  const currentRight = interpolate(eased, [0, 1], [0, pipMarginRight]);
  const currentBottom = interpolate(eased, [0, 1], [0, pipMarginBottom]);
  const currentRadius = interpolate(eased, [0, 1], [0, targetBorderRadius]);
  const currentBorderWidth = interpolate(eased, [0, 1], [0, 2]);
  const currentShadow =
    eased > 0.01 ? "0 20px 50px rgba(0, 0, 0, 0.75)" : "none";

  return (
    <AbsoluteFill style={{ backgroundColor: "#060911", overflow: "hidden" }}>
      {/* Subtle backdrop dimming when host yields stage to diagram */}
      <AbsoluteFill
        style={{
          backgroundColor: "#060911",
          opacity: eased * 0.94,
          transition: "opacity 0.2s ease"
        }}
      />

      {/* Host video container */}
      <div
        style={{
          position: "absolute",
          right: `${currentRight}px`,
          bottom: `${currentBottom}px`,
          width: `${currentWidth}px`,
          height: `${currentHeight}px`,
          borderRadius: `${currentRadius}px`,
          border: `${currentBorderWidth}px solid rgba(255, 255, 255, 0.18)`,
          boxShadow: currentShadow,
          overflow: "hidden",
          transform: `scale(${punchScale})`,
          transformOrigin: "50% 45%",
          zIndex: 10
        }}
      >
        <OffthreadVideo
          src={staticFile(plan.media.file)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
