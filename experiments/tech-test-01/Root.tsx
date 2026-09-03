import React from "react";
import { Composition } from "remotion";
import type { PresentationPlan } from "../../src/p6/types.ts";
import { P6CComposition } from "./P6CComposition.tsx";

const defaultPlan: PresentationPlan = {
  schema_version: 1,
  project_id: "tech-test-01",
  profile: "source",
  style_id: "karve-clean-v1",
  source_duration_seconds: 32.1,
  output_duration_seconds: 32.1,
  canvas: { width: 1280, height: 720, fps: 30, duration_in_frames: 963 },
  media: {
    file: "rough-cut.mp4",
    width: 1280,
    height: 720,
    layout: "native",
    foreground_max_width: 1,
    foreground_max_height: 1
  },
  captions: {
    language: "ar",
    direction: "rtl",
    font_family: "Noto Sans Arabic",
    font_size: 48,
    text_color: "#FFFFFF",
    active_color: "#FFD54A",
    emphasis_color: "#FFD54A",
    background_color: "rgba(8, 12, 20, 0.78)",
    shadow: "0 8px 30px rgba(0, 0, 0, 0.55)",
    border_radius: 28,
    max_width_fraction: 0.84,
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

export const TechTest01Root: React.FC = () => (
  <Composition
    id="TechTest01P6C"
    component={P6CComposition}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={963}
    defaultProps={defaultPlan}
  />
);
