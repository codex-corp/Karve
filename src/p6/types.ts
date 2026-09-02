export type P6ProfileName = "source" | "reel" | "youtube";
export type P6Layout = "native" | "contain_blur";
export type TextDirection = "rtl" | "ltr";
export type VisualIntentType =
  | "punch_in"
  | "caption_emphasis"
  | "title"
  | "callout"
  | "explainer";
export type VisualIntensity = "subtle" | "normal" | "strong";

export type TimelineMapSegment = {
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
};

export type TimelineMap = {
  schema_version: 1;
  project_id: string;
  source_duration_seconds: number;
  output_duration_seconds: number;
  segments: TimelineMapSegment[];
};

export type CaptionWord = {
  /** First raw transcript word contributing to this display token. */
  source_word_index: number;
  /** Stable index in the aligned display-word stream before timeline cuts. */
  display_word_index: number;
  /** Inclusive raw transcript provenance range. */
  source_word_start: number;
  source_word_end: number;
  source_segment_id: number;
  /** Display text used by Remotion. */
  text: string;
  /** Raw ASR phrase that produced this display token. */
  raw_text: string;
  /** Explicit display form after sparse correction. */
  display_text: string;
  probability: number;
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
  retained_fraction: number;
  trimmed_by_cut: boolean;
};

export type RemappedVisualIntent = {
  id: string;
  type: VisualIntentType;
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
  /** Immutable P4 intent text. */
  text: string;
  /** Optional P6 display-only ASR correction for title/callout text. */
  display_text?: string;
  reason: string;
  confidence: number;
  intensity: VisualIntensity;
  source_part: number;
  source_parts: number;
};

export type FontSizeSpec =
  | number
  | {
      mode: "height_fraction";
      fraction: number;
      min: number;
      max: number;
    };

export type P6ProfileConfig = {
  width: number | "source";
  height: number | "source";
  layout: P6Layout;
  fps: number | "source";
  foreground_max_width: number;
  foreground_max_height: number;
  caption: {
    font_size: FontSizeSpec;
    max_width_fraction: number;
    edge_offset_fraction: number;
    max_duration_ms: number;
    silence_gap_ms: number;
    max_chars_per_page: number;
    min_duration_ms: number;
    min_words_per_page: number;
  };
};

export type P6StyleConfig = {
  id: string;
  font_family: string;
  text_color: string;
  active_color: string;
  emphasis_color: string;
  caption_background: string;
  card_background: string;
  card_text_color: string;
  shadow: string;
  border_radius: number;
  punch_scale: Record<VisualIntensity, number>;
};

export type P6Config = {
  schema_version: 1;
  default_profile: P6ProfileName;
  default_style: string;
  profiles: Record<P6ProfileName, P6ProfileConfig>;
  styles: Record<string, P6StyleConfig>;
  render: {
    codec: "h264";
    audio_codec: "aac";
    crf: number;
    audio_bitrate: string;
    pixel_format: "yuv420p";
    concurrency: number;
  };
};

export type PresentationPlan = {
  schema_version: 1;
  project_id: string;
  profile: P6ProfileName;
  style_id: string;
  source_duration_seconds: number;
  output_duration_seconds: number;
  canvas: {
    width: number;
    height: number;
    fps: number;
    duration_in_frames: number;
  };
  media: {
    file: "rough-cut.mp4";
    width: number;
    height: number;
    layout: P6Layout;
    foreground_max_width: number;
    foreground_max_height: number;
  };
  captions: {
    language: string;
    direction: TextDirection;
    font_family: string;
    font_size: number;
    text_color: string;
    active_color: string;
    emphasis_color: string;
    background_color: string;
    shadow: string;
    border_radius: number;
    max_width_fraction: number;
    edge_offset_fraction: number;
    max_duration_ms: number;
    silence_gap_ms: number;
    max_chars_per_page: number;
    min_duration_ms: number;
    min_words_per_page: number;
    words: CaptionWord[];
    linger_ms: number;
  };
  motion: {
    punch_scale: Record<VisualIntensity, number>;
    card_background: string;
    card_text_color: string;
    border_radius: number;
  };
  visual_intents: RemappedVisualIntent[];
  deferred_visual_intents: RemappedVisualIntent[];
  metrics: {
    /** Raw P3 transcript word count. */
    source_words: number;
    /** Display-word count after sparse structural ASR corrections and before timeline cuts. */
    aligned_words: number;
    /** Display words retained after P5 timeline mapping. */
    caption_words: number;
    dropped_words: number;
    trimmed_words: number;
    source_visual_intents: number;
    rendered_visual_intents: number;
    deferred_visual_intents: number;
    dropped_visual_intents: number;
    split_visual_intent_fragments: number;
  };
};
