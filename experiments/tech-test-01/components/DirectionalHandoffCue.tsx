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
 * DirectionalHandoffCue for Beat 4 (29.50s -> 31.92s)
 * Powered by Karve P7-C2 Style Tokens (karve-technical-v1).
 *
 * Rules:
 *   - Restrained directional handoff cue ("خلينا نشوف مباشرة كيف بقدر").
 *   - Clean Arabic typography with zero English template noise.
 *   - Revealed at 30.60s (word 'نشوف'), settles by 31.28s ('مباشرة').
 *   - Does NOT fabricate or invent a fake product UI surface.
 */
export const DirectionalHandoffCue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSeconds = frame / fps;

  const profile = getStyleProfile("karve-technical-v1");
  const tokens = resolveStyleTokens(profile, { width, height });

  // Active range: 30.40s -> 31.92s
  if (timeSeconds < 30.40 || timeSeconds >= 32.1) {
    return null;
  }

  // Entrance spring (30.60s)
  const enterProgress = spring({
    frame: Math.max(0, frame - Math.round(30.60 * fps)),
    fps,
    config: { damping: 15, stiffness: 110 }
  });

  const opacity = enterProgress;
  const pulse = Math.sin(timeSeconds * 6) * 4;

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
          gap: "14px",
          padding: "14px 26px",
          backgroundColor: tokens.colors.card_surface,
          backdropFilter: "blur(16px)",
          borderRadius: `${tokens.radius.card}px`,
          border: `${tokens.stroke.card_border}px solid ${tokens.colors.accent_primary}`,
          boxShadow: `0 14px 40px rgba(56, 189, 248, 0.22)`,
          transform: `translateY(${interpolate(enterProgress, [0, 1], [-12, 0])}px)`
        }}
      >
        <span
          style={{
            color: tokens.colors.text_primary,
            fontSize: `${tokens.typography.scale.subhead}px`,
            fontWeight: tokens.typography.weights.bold,
            fontFamily: tokens.typography.font_family_arabic,
            letterSpacing: "0.4px"
          }}
        >
          انتقال إلى التطبيق المباشر
        </span>
        <span
          style={{
            fontSize: "22px",
            color: tokens.colors.accent_primary,
            transform: `translateX(${pulse}px)`,
            display: "inline-block"
          }}
        >
          ➔
        </span>
      </div>
    </AbsoluteFill>
  );
};
