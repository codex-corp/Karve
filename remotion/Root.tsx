import React from "react";
import { Composition } from "remotion";
import type { PresentationPlan } from "../src/p6/types.ts";
import { KarveP6Composition } from "./components/KarveP6Composition.tsx";

const defaultPlan: PresentationPlan = {
  schema_version: 1,
  project_id: "preview",
  profile: "source",
  style_id: "karve-clean-v1",
  source_duration_seconds: 1,
  output_duration_seconds: 1,
  canvas: { width: 1920, height: 1080, fps: 30, duration_in_frames: 30 },
  media: {
    file: "rough-cut.mp4",
    width: 1920,
    height: 1080,
    layout: "native",
    foreground_max_width: 1,
    foreground_max_height: 1
  },
  captions: {
    language: "ar",
    direction: "rtl",
    font_family: "Noto Sans Arabic",
    font_size: 68,
    text_color: "#FFFFFF",
    active_color: "#FFD54A",
    emphasis_color: "#FFD54A",
    background_color: "rgba(8, 12, 20, 0.78)",
    shadow: "0 8px 30px rgba(0, 0, 0, 0.55)",
    border_radius: 28,
    max_width_fraction: 0.75,
    edge_offset_fraction: 0.1,
    max_duration_ms: 1700,
    silence_gap_ms: 420,
    max_chars_per_page: 34,
    min_duration_ms: 320,
    min_words_per_page: 2,
    words: [],
    linger_ms: 180
  },
  motion: {
    punch_scale: { subtle: 1.035, normal: 1.06, strong: 1.09 },
    card_background: "rgba(8, 12, 20, 0.88)",
    card_text_color: "#FFFFFF",
    border_radius: 28
  },
  visual_intents: [],
  deferred_visual_intents: [],
  metrics: {
    source_words: 0,
    aligned_words: 0,
    caption_words: 0,
    dropped_words: 0,
    trimmed_words: 0,
    source_visual_intents: 0,
    rendered_visual_intents: 0,
    deferred_visual_intents: 0,
    dropped_visual_intents: 0,
    split_visual_intent_fragments: 0
  }
};

export const KarveRoot: React.FC = () => (
  <Composition
    id="KarveP6"
    component={KarveP6Composition}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30}
    defaultProps={defaultPlan}
  />
);
