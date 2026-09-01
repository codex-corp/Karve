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
  source_word_index: number;
  source_segment_id: number;
  text: string;
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
  text: string;
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
    source_words: number;
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
