import type { TikTokPage } from "@remotion/captions";
import React, { useMemo } from "react";
import {
  captionsFromWords,
  createCaptionPages,
  useTokenStates
} from "remotion-captions-kit";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import {
  normalizeArabicBoundaryPunctuation,
  timingKey
} from "../../src/p6/arabic.ts";
import type { PresentationPlan, RemappedVisualIntent } from "../../src/p6/types.ts";

type CaptionSettings = PresentationPlan["captions"];

type ArabicCaptionPageProps = {
  page: TikTokPage;
  settings: CaptionSettings;
  emphasis: RemappedVisualIntent[];
};

function overlaps(start: number, end: number, intent: RemappedVisualIntent): boolean {
  return start < intent.output_end && end > intent.output_start;
}

function createPages(plan: PresentationPlan): TikTokPage[] {
  const lingerMs = plan.captions.linger_ms ?? 180;
  const originalByTiming = new Map<string, string[]>();
  const normalizedWords = plan.captions.words.map((word) => {
    const startMs = word.output_start * 1000;
    const endMs = word.output_end * 1000;
    const key = timingKey(startMs, endMs);
    const values = originalByTiming.get(key) || [];
    // Prefer display_text (corrected) over raw text when available.
    const displayText = word.display_text || word.text;
    values.push(displayText);
    originalByTiming.set(key, values);
    return {
      word: normalizeArabicBoundaryPunctuation(displayText),
      start: word.output_start,
      end: word.output_end
    };
  });

  const { captions } = captionsFromWords({ words: normalizedWords, timeUnit: "seconds" });
  const pages = createCaptionPages({
    captions,
    maxDurationMs: plan.captions.max_duration_ms,
    silenceGapMs: plan.captions.silence_gap_ms,
    maxCharsPerPage: plan.captions.max_chars_per_page,
    minDurationMs: plan.captions.min_duration_ms,
    minWordsPerPage: plan.captions.min_words_per_page,
    breakOnPunctuation: true
  }).pages;

  // Pagination sees normalized punctuation, but display text must remain the
  // corrected or raw token. Restore by exact word timing after page boundaries exist.
  return pages.map((page) => {
    const tokens = page.tokens.map((token, index) => {
      const key = timingKey(token.fromMs, token.toMs);
      const originals = originalByTiming.get(key) || [];
      const original = originals.shift() || token.text.trim();
      return {
        ...token,
        text: index === 0 ? original : ` ${original}`
      };
    });
    const lastToken = tokens[tokens.length - 1];
    const speechEndMs = lastToken ? lastToken.toMs : page.startMs + page.durationMs;
    const boundedDurationMs = Math.min(
      page.durationMs,
      Math.max(plan.captions.min_duration_ms, speechEndMs - page.startMs + lingerMs)
    );
    return {
      ...page,
      durationMs: boundedDurationMs,
      tokens,
      text: tokens.map((token) => token.text).join("").trim()
    };
  });
}

const ArabicCaptionPage: React.FC<ArabicCaptionPageProps> = ({
  page,
  settings,
  emphasis
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const { tokens } = useTokenStates({ page });
  const durationFrames = Math.max(1, Math.round((page.durationMs / 1000) * fps));
  const enter = interpolate(frame, [0, Math.max(2, Math.round(fps * 0.12))], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const exit = interpolate(
    frame,
    [Math.max(0, durationFrames - Math.max(2, Math.round(fps * 0.10))), durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const visibility = Math.min(enter, exit);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: height * settings.edge_offset_fraction,
        pointerEvents: "none"
      }}
    >
      <div
        dir="rtl"
        lang={settings.language || "ar"}
        style={{
          direction: "rtl",
          maxWidth: `${settings.max_width_fraction * 100}%`,
          padding: `${Math.max(8, settings.font_size * 0.20)}px ${Math.max(
            14,
            settings.font_size * 0.34
          )}px`,
          borderRadius: Math.min(settings.border_radius, settings.font_size * 0.62),
          background: settings.background_color,
          boxShadow: settings.shadow,
          color: settings.text_color,
          fontFamily: settings.font_family,
          fontSize: settings.font_size,
          fontWeight: 700,
          lineHeight: 1.35,
          textAlign: "center",
          textWrap: "balance",
          opacity: visibility,
          transform: `translateY(${(1 - visibility) * 16}px) scale(${0.985 + visibility * 0.015})`
        }}
      >
        {tokens.map(({ token, isActive }, index) => {
          const start = token.fromMs / 1000;
          const end = token.toMs / 1000;
          const emphasized = emphasis.some((intent) => overlaps(start, end, intent));
          const color = isActive
            ? settings.active_color
            : emphasized
              ? settings.emphasis_color
              : settings.text_color;
          return (
            <React.Fragment key={`${token.fromMs}-${token.toMs}-${index}`}>
              <span
                style={{
                  display: "inline",
                  whiteSpace: "nowrap",
                  color,
                  fontWeight: isActive ? 800 : 700,
                  opacity: isActive ? 1 : 0.88,
                  textDecoration: emphasized && !isActive ? "underline" : "none",
                  textDecorationThickness: Math.max(2, settings.font_size * 0.045),
                  textUnderlineOffset: Math.max(4, settings.font_size * 0.10),
                  textShadow: isActive
                    ? `0 0 ${Math.max(12, settings.font_size * 0.25)}px ${settings.active_color}`
                    : "none"
                }}
              >
                {token.text.trim()}
              </span>
              {index < tokens.length - 1 ? " " : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ArabicCaptions: React.FC<{ plan: PresentationPlan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const pages = useMemo(() => createPages(plan), [plan]);
  const emphasis = useMemo(
    () => plan.visual_intents.filter((intent) => intent.type === "caption_emphasis"),
    [plan.visual_intents]
  );

  return (
    <>
      {pages.map((page, index) => {
        const startFrame = Math.round((page.startMs / 1000) * fps);
        const durationFrames = Math.max(1, Math.round((page.durationMs / 1000) * fps));
        return (
          <Sequence
            key={`caption-page-${page.startMs}-${index}`}
            from={startFrame}
            durationInFrames={durationFrames}
            layout="none"
          >
            <ArabicCaptionPage page={page} settings={plan.captions} emphasis={emphasis} />
          </Sequence>
        );
      })}
    </>
  );
};
