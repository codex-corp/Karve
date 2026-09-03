import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import { getStyleProfile, resolveStyleTokens } from "../../../src/p7/style-profile.ts";

/**
 * ValueAccentIndicator for Beat 3 (24.96s -> 29.50s)
 * Powered by Karve P7-C2 Style Tokens (karve-technical-v1).
 *
 * Rules:
 *   - Strictly adheres to spoken text: "أفضل وأفضل".
 *   - Positioned in upper safe area (top: 44px, left: 56px), strictly clear of face and captions.
 *   - Leaves the accepted Karve P6 caption layer 100% untouched.
 */
export const ValueAccentIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSeconds = frame / fps;

  const profile = getStyleProfile("karve-technical-v1");
  const tokens = resolveStyleTokens(profile, { width, height });

  // Active range: 24.96s -> 29.50s
  if (timeSeconds < 24.96 || timeSeconds >= 29.6) {
    return null;
  }

  // Entrance spring (24.96s)
  const enterProgress = spring({
    frame: Math.max(0, frame - Math.round(24.96 * fps)),
    fps,
    config: { damping: 16, stiffness: 100 }
  });

  // Exit fade (29.20s -> 29.50s)
  const exitOpacity = interpolate(
    timeSeconds,
    [29.20, 29.50],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = enterProgress * exitOpacity;

  return (
    <AbsoluteFill
      style={{
        position: "absolute",
        top: "44px",
        left: "56px",
        width: "fit-content",
        height: "fit-content",
        opacity,
        pointerEvents: "none",
        zIndex: 15
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 24px",
          backgroundColor: tokens.colors.card_surface,
          backdropFilter: "blur(16px)",
          borderRadius: `${tokens.radius.card}px`,
          border: `${tokens.stroke.card_border}px solid ${tokens.colors.accent_primary}`,
          boxShadow: `0 12px 36px rgba(56, 189, 248, 0.22)`,
          transform: `translateY(${interpolate(enterProgress, [0, 1], [-12, 0])}px)`
        }}
      >
        <span style={{ fontSize: "22px" }}>✨</span>
        <span
          style={{
            color: tokens.colors.text_primary,
            fontSize: `${tokens.typography.scale.subhead}px`,
            fontWeight: tokens.typography.weights.bold,
            fontFamily: tokens.typography.font_family_arabic,
            letterSpacing: "0.4px"
          }}
        >
          أفضل وأفضل
        </span>
      </div>
    </AbsoluteFill>
  );
};
