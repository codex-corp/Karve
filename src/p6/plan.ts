import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import {
  applyCorrections,
  flattenTranscriptWords,
  type CaptionCorrections,
  type TranscriptWord
} from "./align.ts";
import {
  isRtlLanguage,
  mapAlignedWords,
  mapVisualIntents,
  parseFps,
  round6,
  validateTimelineMap,
  type TranscriptSegmentInput,
  type VisualIntentInput
} from "./timeline.ts";
import type {
  FontSizeSpec,
  P6Config,
  P6ProfileConfig,
  P6ProfileName,
  P6StyleConfig,
  PresentationPlan,
  TimelineMap
} from "./types.ts";

type SourceMetadata = {
  schema_version: 1;
  project_id: string;
  source: {
    duration_seconds: number;
  };
  video: {
    width: number;
    height: number;
    avg_frame_rate: string;
  };
};

type Transcript = {
  schema_version: 1;
  project_id: string;
  language?: {
    requested?: string;
    detected?: string;
  };
  segments: TranscriptSegmentInput[];
};

type RoughCutPlan = {
  schema_version: 1;
  project_id: string;
  source_duration_seconds: number;
  output_duration_seconds: number;
  carried_visual_intents: VisualIntentInput[];
};

export type RoughCutProbe = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoStreams: number;
  audioStreams: number;
};

export type BuildPresentationInput = {
  projectId: string;
  profileName: P6ProfileName;
  styleId?: string;
  config: P6Config;
  source: SourceMetadata;
  transcript: Transcript;
  timelineMap: TimelineMap;
  roughCutPlan: RoughCutPlan;
  roughCutProbe: RoughCutProbe;
  captionCorrections?: CaptionCorrections | null;
};

function fail(message: string): never {
  throw new Error(message);
}

export function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${String(error)}`);
  }
}

function evenDimension(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 2) {
    fail(`Invalid ${label}: ${String(value)}`);
  }
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function finiteBetween(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    fail(`${label} must be between ${min} and ${max}`);
  }
}

function positiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    fail(`${label} must be a positive integer`);
  }
}

function validateFontSizeSpec(spec: FontSizeSpec, label: string): void {
  if (typeof spec === "number") {
    finiteBetween(spec, 8, 300, label);
    return;
  }
  if (!spec || spec.mode !== "height_fraction") {
    fail(`${label} has an unsupported dynamic font-size mode`);
  }
  finiteBetween(spec.fraction, 0.01, 0.30, `${label}.fraction`);
  finiteBetween(spec.min, 8, 300, `${label}.min`);
  finiteBetween(spec.max, spec.min, 400, `${label}.max`);
}

function validateProfile(profile: P6ProfileConfig, name: string): void {
  if (profile.width !== "source") {
    evenDimension(profile.width, `${name}.width`);
  }
  if (profile.height !== "source") {
    evenDimension(profile.height, `${name}.height`);
  }
  if (profile.fps !== "source") {
    parseFps(profile.fps);
  }
  if (!( ["native", "contain_blur"] as string[]).includes(profile.layout)) {
    fail(`${name}.layout is unsupported`);
  }
  finiteBetween(profile.foreground_max_width, 0.1, 1, `${name}.foreground_max_width`);
  finiteBetween(profile.foreground_max_height, 0.1, 1, `${name}.foreground_max_height`);
  validateFontSizeSpec(profile.caption.font_size, `${name}.caption.font_size`);
  finiteBetween(
    profile.caption.max_width_fraction,
    0.2,
    1,
    `${name}.caption.max_width_fraction`
  );
  finiteBetween(
    profile.caption.edge_offset_fraction,
    0,
    0.45,
    `${name}.caption.edge_offset_fraction`
  );
  positiveInteger(profile.caption.max_duration_ms, `${name}.caption.max_duration_ms`);
  positiveInteger(profile.caption.silence_gap_ms, `${name}.caption.silence_gap_ms`);
  positiveInteger(profile.caption.max_chars_per_page, `${name}.caption.max_chars_per_page`);
  positiveInteger(profile.caption.min_duration_ms, `${name}.caption.min_duration_ms`);
  positiveInteger(profile.caption.min_words_per_page, `${name}.caption.min_words_per_page`);
}

function validateStyle(style: P6StyleConfig, key: string): void {
  if (style.id !== key) {
    fail(`Style key '${key}' does not match style.id '${style.id}'`);
  }
  for (const [name, value] of Object.entries({
    font_family: style.font_family,
    text_color: style.text_color,
    active_color: style.active_color,
    emphasis_color: style.emphasis_color,
    caption_background: style.caption_background,
    card_background: style.card_background,
    card_text_color: style.card_text_color,
    shadow: style.shadow
  })) {
    if (!String(value || "").trim()) {
      fail(`Style '${key}' has an empty ${name}`);
    }
  }
  finiteBetween(style.border_radius, 0, 200, `styles.${key}.border_radius`);
  for (const intensity of ["subtle", "normal", "strong"] as const) {
    finiteBetween(
      style.punch_scale[intensity],
      1,
      1.35,
      `styles.${key}.punch_scale.${intensity}`
    );
  }
  if (
    style.punch_scale.subtle > style.punch_scale.normal ||
    style.punch_scale.normal > style.punch_scale.strong
  ) {
    fail(`Style '${key}' punch scales must be ordered subtle <= normal <= strong`);
  }
}

export function validateP6Config(config: P6Config): void {
  if (config.schema_version !== 1) {
    fail("P6 profile config schema_version must be 1");
  }
  if (!config.profiles[config.default_profile]) {
    fail(`P6 default profile does not exist: ${config.default_profile}`);
  }
  if (!config.styles[config.default_style]) {
    fail(`P6 default style does not exist: ${config.default_style}`);
  }
  for (const profileName of ["source", "reel", "youtube"] as const) {
    const profile = config.profiles[profileName];
    if (!profile) {
      fail(`P6 profile is missing: ${profileName}`);
    }
    validateProfile(profile, `profiles.${profileName}`);
  }
  for (const [styleId, style] of Object.entries(config.styles)) {
    validateStyle(style, styleId);
  }
  if (config.render.codec !== "h264" || config.render.audio_codec !== "aac") {
    fail("P6 V1 render supports h264 video and aac audio only");
  }
  finiteBetween(config.render.crf, 0, 51, "render.crf");
  if (!/^[1-9][0-9]*k$/.test(config.render.audio_bitrate)) {
    fail("render.audio_bitrate must use a value such as 192k");
  }
  if (config.render.pixel_format !== "yuv420p") {
    fail("P6 V1 requires yuv420p output");
  }
  positiveInteger(config.render.concurrency, "render.concurrency");
}

function resolveFontSize(spec: FontSizeSpec, canvasHeight: number): number {
  if (typeof spec === "number") {
    return Math.round(spec);
  }
  return Math.round(Math.max(spec.min, Math.min(spec.max, canvasHeight * spec.fraction)));
}

function validateProjectInputs(input: BuildPresentationInput): void {
  const { projectId, source, transcript, timelineMap, roughCutPlan, roughCutProbe } = input;
  if (
    source.schema_version !== 1 ||
    transcript.schema_version !== 1 ||
    timelineMap.schema_version !== 1 ||
    roughCutPlan.schema_version !== 1
  ) {
    fail("P6 currently supports schema_version 1 inputs only");
  }
  for (const [name, actual] of [
    ["source.json", source.project_id],
    ["transcript.json", transcript.project_id],
    ["timeline-map.json", timelineMap.project_id],
    ["rough-cut-plan.json", roughCutPlan.project_id]
  ] as const) {
    if (actual !== projectId) {
      fail(`${name} project id '${actual}' does not match '${projectId}'`);
    }
  }
  validateTimelineMap(timelineMap);
  if (!Array.isArray(transcript.segments)) {
    fail("transcript.json segments must be an array");
  }
  if (!Array.isArray(roughCutPlan.carried_visual_intents)) {
    fail("rough-cut-plan carried_visual_intents must be an array");
  }
  if (Math.abs(source.source.duration_seconds - timelineMap.source_duration_seconds) > 1e-3) {
    fail("source.json duration does not match timeline-map");
  }
  if (Math.abs(roughCutPlan.source_duration_seconds - timelineMap.source_duration_seconds) > 1e-3) {
    fail("rough-cut-plan source duration does not match timeline-map");
  }
  if (Math.abs(roughCutPlan.output_duration_seconds - timelineMap.output_duration_seconds) > 1e-3) {
    fail("rough-cut-plan output duration does not match timeline-map");
  }
  if (roughCutProbe.videoStreams < 1 || roughCutProbe.audioStreams < 1) {
    fail("rough-cut.mp4 must contain both video and audio");
  }
  if (
    !Number.isFinite(roughCutProbe.width) ||
    !Number.isFinite(roughCutProbe.height) ||
    roughCutProbe.width < 2 ||
    roughCutProbe.height < 2
  ) {
    fail("rough-cut.mp4 has invalid dimensions");
  }
  parseFps(roughCutProbe.fps);
  if (Math.abs(roughCutProbe.duration - timelineMap.output_duration_seconds) > 0.30) {
    fail(
      `rough-cut duration ${roughCutProbe.duration.toFixed(3)}s differs from timeline-map ` +
        `${timelineMap.output_duration_seconds.toFixed(3)}s by more than 0.30s`
    );
  }
}

function overlaps(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && end > otherStart;
}

/**
 * Keep immutable P4 intent text while applying sparse P6-B display corrections
 * to title/callout text only when both source timing and exact ASR evidence match.
 */
export function applyCaptionCorrectionsToVisualIntents(
  intents: VisualIntentInput[],
  flatWords: TranscriptWord[],
  corrections: CaptionCorrections | null | undefined
): VisualIntentInput[] {
  if (!corrections || corrections.corrections.length === 0) {
    return intents;
  }

  const orderedCorrections = [...corrections.corrections].sort(
    (a, b) => a.source_word_start - b.source_word_start
  );

  return intents.map((intent) => {
    if ((intent.type !== "title" && intent.type !== "callout") || !intent.text.trim()) {
      return intent;
    }

    let displayText = String(intent.display_text || intent.text).trim();
    for (const correction of orderedCorrections) {
      const firstWord = flatWords[correction.source_word_start];
      const lastWord = flatWords[correction.source_word_end];
      if (!firstWord || !lastWord) {
        throw new Error(
          `Visual text correction range [${correction.source_word_start}, ${correction.source_word_end}] is out of bounds`
        );
      }
      if (!overlaps(intent.start, intent.end, firstWord.start, lastWord.end)) {
        continue;
      }
      if (!displayText.includes(correction.original_text)) {
        continue;
      }
      displayText = displayText.replace(
        correction.original_text,
        correction.replacement.join(" ")
      );
    }

    return displayText !== intent.text ? { ...intent, display_text: displayText } : intent;
  });
}

export function buildPresentationPlan(input: BuildPresentationInput): PresentationPlan {
  validateProjectInputs(input);
  const { config, profileName, projectId, transcript, timelineMap, roughCutPlan, roughCutProbe } = input;
  validateP6Config(config);
  const profile = config.profiles[profileName];
  if (!profile) {
    fail(`Unknown P6 profile: ${profileName}`);
  }
  const styleId = input.styleId || config.default_style;
  const style = config.styles[styleId];
  if (!style) {
    fail(`Unknown P6 style: ${styleId}`);
  }

  const width = evenDimension(
    profile.width === "source" ? roughCutProbe.width : profile.width,
    "canvas width"
  );
  const height = evenDimension(
    profile.height === "source" ? roughCutProbe.height : profile.height,
    "canvas height"
  );
  const fps = parseFps(profile.fps === "source" ? roughCutProbe.fps : profile.fps);
  const durationInFrames = Math.max(1, Math.ceil(timelineMap.output_duration_seconds * fps));

  const flatWords = flattenTranscriptWords(transcript.segments || []);
  const alignedResult = applyCorrections(flatWords, input.captionCorrections, projectId);
  const mappedWords = mapAlignedWords(
    alignedResult.words.map((word, displayWordIndex) => ({
      text: word.display_text,
      raw_text: word.raw_text,
      start: word.start,
      end: word.end,
      probability: word.probability,
      segment_id: word.segment_id,
      display_word_index: displayWordIndex,
      source_word_start: word.source_word_start,
      source_word_end: word.source_word_end
    })),
    timelineMap
  );
  if (mappedWords.words.length === 0) {
    fail("P6 has no retained caption words after applying timeline-map");
  }

  const correctedVisualIntents = applyCaptionCorrectionsToVisualIntents(
    roughCutPlan.carried_visual_intents || [],
    flatWords,
    input.captionCorrections
  );
  const mappedIntents = mapVisualIntents(correctedVisualIntents, timelineMap);
  const language =
    transcript.language?.detected ||
    (transcript.language?.requested && transcript.language.requested !== "auto"
      ? transcript.language.requested
      : "ar");

  return {
    schema_version: 1,
    project_id: projectId,
    profile: profileName,
    style_id: styleId,
    source_duration_seconds: round6(timelineMap.source_duration_seconds),
    output_duration_seconds: round6(timelineMap.output_duration_seconds),
    canvas: {
      width,
      height,
      fps,
      duration_in_frames: durationInFrames
    },
    media: {
      file: "rough-cut.mp4",
      width: evenDimension(roughCutProbe.width, "media width"),
      height: evenDimension(roughCutProbe.height, "media height"),
      layout: profile.layout,
      foreground_max_width: profile.foreground_max_width,
      foreground_max_height: profile.foreground_max_height
    },
    captions: {
      language,
      direction: isRtlLanguage(language) ? "rtl" : "ltr",
      font_family: style.font_family,
      font_size: resolveFontSize(profile.caption.font_size, height),
      text_color: style.text_color,
      active_color: style.active_color,
      emphasis_color: style.emphasis_color,
      background_color: style.caption_background,
      shadow: style.shadow,
      border_radius: style.border_radius,
      max_width_fraction: profile.caption.max_width_fraction,
      edge_offset_fraction: profile.caption.edge_offset_fraction,
      max_duration_ms: profile.caption.max_duration_ms,
      silence_gap_ms: profile.caption.silence_gap_ms,
      max_chars_per_page: profile.caption.max_chars_per_page,
      min_duration_ms: profile.caption.min_duration_ms,
      min_words_per_page: profile.caption.min_words_per_page,
      words: mappedWords.words,
      linger_ms: 180
    },
    motion: {
      punch_scale: style.punch_scale,
      card_background: style.card_background,
      card_text_color: style.card_text_color,
      border_radius: style.border_radius
    },
    visual_intents: mappedIntents.rendered,
    deferred_visual_intents: mappedIntents.deferred,
    metrics: {
      source_words: flatWords.length,
      aligned_words: alignedResult.words.length,
      caption_words: mappedWords.words.length,
      dropped_words: mappedWords.droppedWords,
      trimmed_words: mappedWords.trimmedWords,
      source_visual_intents: (roughCutPlan.carried_visual_intents || []).length,
      rendered_visual_intents: mappedIntents.rendered.length,
      deferred_visual_intents: mappedIntents.deferred.length,
      dropped_visual_intents: mappedIntents.dropped,
      split_visual_intent_fragments: mappedIntents.splitFragments
    }
  };
}

export function probeRoughCut(path: string): RoughCutProbe {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,width,height,avg_frame_rate",
      "-of",
      "json",
      path
    ],
    { encoding: "utf8" }
  );
  if (result.error) {
    fail(`ffprobe failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`ffprobe failed: ${(result.stderr || result.stdout || "no output").trim()}`);
  }
  const parsed = JSON.parse(result.stdout || "{}") as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
    }>;
  };
  const streams = parsed.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video");
  return {
    duration: Number(parsed.format?.duration || 0),
    width: Number(video?.width || 0),
    height: Number(video?.height || 0),
    fps: parseFps(video?.avg_frame_rate || "30/1"),
    videoStreams: streams.filter((stream) => stream.codec_type === "video").length,
    audioStreams: streams.filter((stream) => stream.codec_type === "audio").length
  };
}

export function buildPlanFromProject(options: {
  projectId: string;
  profileName: P6ProfileName;
  styleId?: string;
  dataRoot?: string;
  configPath?: string;
}): PresentationPlan {
  const dataRoot = resolve(options.dataRoot || process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", options.projectId);
  const configPath = resolve(options.configPath || join("config", "p6-profiles.json"));
  const correctionsPath = join(projectDir, "caption-corrections.json");
  const captionCorrections = existsSync(correctionsPath)
    ? readJson<CaptionCorrections>(correctionsPath)
    : null;

  return buildPresentationPlan({
    projectId: options.projectId,
    profileName: options.profileName,
    styleId: options.styleId,
    config: readJson<P6Config>(configPath),
    source: readJson<SourceMetadata>(join(projectDir, "source.json")),
    transcript: readJson<Transcript>(join(projectDir, "transcript.json")),
    timelineMap: readJson<TimelineMap>(join(projectDir, "timeline-map.json")),
    roughCutPlan: readJson<RoughCutPlan>(join(projectDir, "rough-cut-plan.json")),
    roughCutProbe: probeRoughCut(join(projectDir, "rough-cut.mp4")),
    captionCorrections
  });
}
