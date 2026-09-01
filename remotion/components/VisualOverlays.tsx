import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { PresentationPlan, RemappedVisualIntent } from "../../src/p6/types.ts";

function intentProgress(
  intent: RemappedVisualIntent,
  timeSeconds: number,
  fps: number
): number {
  const ramp = Math.max(4 / fps, 0.16);
  const enter = interpolate(
    timeSeconds,
    [intent.output_start, intent.output_start + ramp],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exit = interpolate(
    timeSeconds,
    [Math.max(intent.output_start, intent.output_end - ramp), intent.output_end],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return Math.min(enter, exit);
}

function bestActiveCardIntent(
  intents: RemappedVisualIntent[],
  timeSeconds: number
): RemappedVisualIntent | null {
  const priority = (intent: RemappedVisualIntent): number =>
    intent.type === "title" ? 2 : intent.type === "callout" ? 1 : 0;
  return (
    intents
      .filter(
        (intent) =>
          (intent.type === "title" || intent.type === "callout") &&
          timeSeconds >= intent.output_start &&
          timeSeconds < intent.output_end &&
          intent.text
      )
      .sort(
        (a, b) =>
          priority(b) - priority(a) ||
          b.confidence - a.confidence ||
          a.output_start - b.output_start
      )[0] || null
  );
}

const OverlayCard: React.FC<{
  intent: RemappedVisualIntent;
  plan: PresentationPlan;
  progress: number;
}> = ({ intent, plan, progress }) => {
  const isTitle = intent.type === "title";
  const { width, height } = useVideoConfig();
  const direction = plan.captions.direction;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: isTitle ? "center" : direction === "rtl" ? "flex-end" : "flex-start",
        paddingTop: height * (isTitle ? 0.07 : 0.11),
        paddingLeft: width * 0.055,
        paddingRight: width * 0.055,
        pointerEvents: "none"
      }}
    >
      <div
        dir={direction}
        lang={plan.captions.language}
        style={{
          maxWidth: isTitle ? "78%" : "58%",
          padding: isTitle ? "20px 34px" : "17px 26px",
          borderRadius: plan.motion.border_radius,
          background: plan.motion.card_background,
          color: plan.motion.card_text_color,
          boxShadow: plan.captions.shadow,
          fontFamily: plan.captions.font_family,
          fontSize: isTitle ? plan.captions.font_size * 0.88 : plan.captions.font_size * 0.64,
          fontWeight: isTitle ? 800 : 700,
          lineHeight: 1.35,
          textAlign: direction === "rtl" ? "right" : "left",
          whiteSpace: "pre-wrap",
          direction,
          unicodeBidi: "plaintext",
          opacity: progress,
          transform: `translateY(${(1 - progress) * -18}px) scale(${0.985 + progress * 0.015})`
        }}
      >
        {intent.text}
      </div>
    </AbsoluteFill>
  );
};

export const VisualOverlays: React.FC<{ plan: PresentationPlan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSeconds = frame / fps;
  const cardIntents = useMemo(
    () =>
      plan.visual_intents.filter(
        (intent) => intent.type === "title" || intent.type === "callout"
      ),
    [plan.visual_intents]
  );
  const card = bestActiveCardIntent(cardIntents, timeSeconds);

  return card ? (
    <OverlayCard
      intent={card}
      plan={plan}
      progress={intentProgress(card, timeSeconds, fps)}
    />
  ) : null;
};
