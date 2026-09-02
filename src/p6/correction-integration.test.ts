import assert from "node:assert/strict";
import { buildPresentationPlan } from "./plan.ts";
import type { CaptionCorrections } from "./align.ts";
import type { P6Config, TimelineMap } from "./types.ts";

const projectId = "p6b2-test";
const timelineMap: TimelineMap = {
  schema_version: 1,
  project_id: projectId,
  source_duration_seconds: 3,
  output_duration_seconds: 3,
  segments: [
    { source_start: 0, source_end: 3, output_start: 0, output_end: 3 }
  ]
};

const config: P6Config = {
  schema_version: 1,
  default_profile: "source",
  default_style: "test",
  profiles: {
    source: {
      width: "source",
      height: "source",
      layout: "native",
      fps: "source",
      foreground_max_width: 1,
      foreground_max_height: 1,
      caption: {
        font_size: 30,
        max_width_fraction: 0.84,
        edge_offset_fraction: 0.1,
        max_duration_ms: 1700,
        silence_gap_ms: 420,
        max_chars_per_page: 34,
        min_duration_ms: 320,
        min_words_per_page: 2
      }
    },
    reel: {
      width: 1080,
      height: 1920,
      layout: "contain_blur",
      fps: "source",
      foreground_max_width: 0.94,
      foreground_max_height: 0.82,
      caption: {
        font_size: 74,
        max_width_fraction: 0.88,
        edge_offset_fraction: 0.19,
        max_duration_ms: 1450,
        silence_gap_ms: 400,
        max_chars_per_page: 27,
        min_duration_ms: 300,
        min_words_per_page: 2
      }
    },
    youtube: {
      width: 1920,
      height: 1080,
      layout: "contain_blur",
      fps: "source",
      foreground_max_width: 0.92,
      foreground_max_height: 0.94,
      caption: {
        font_size: 68,
        max_width_fraction: 0.7,
        edge_offset_fraction: 0.1,
        max_duration_ms: 1800,
        silence_gap_ms: 440,
        max_chars_per_page: 42,
        min_duration_ms: 320,
        min_words_per_page: 2
      }
    }
  },
  styles: {
    test: {
      id: "test",
      font_family: "Noto Sans Arabic",
      text_color: "#fff",
      active_color: "#ff0",
      emphasis_color: "#ff0",
      caption_background: "rgba(0,0,0,.8)",
      card_background: "rgba(0,0,0,.9)",
      card_text_color: "#fff",
      shadow: "none",
      border_radius: 20,
      punch_scale: { subtle: 1.03, normal: 1.06, strong: 1.09 }
    }
  },
  render: {
    codec: "h264",
    audio_codec: "aac",
    crf: 18,
    audio_bitrate: "192k",
    pixel_format: "yuv420p",
    concurrency: 1
  }
};

const corrections: CaptionCorrections = {
  schema_version: 1,
  project_id: projectId,
  corrections: [
    {
      source_word_start: 1,
      source_word_end: 1,
      original_text: "شرقه",
      replacement: ["شوقه"],
      reason: "phonetic_asr_error",
      confidence: 0.9
    },
    {
      source_word_start: 3,
      source_word_end: 4,
      original_text: "عوالية الحلبية",
      replacement: ["عوالِي الحلبية"],
      reason: "wrong_word_boundary",
      confidence: 0.88
    },
    {
      source_word_start: 5,
      source_word_end: 6,
      original_text: "أبو سرابك",
      replacement: ["أبو سُرّك"],
      reason: "phonetic_asr_error",
      confidence: 0.92
    }
  ]
};

const plan = buildPresentationPlan({
  projectId,
  profileName: "source",
  config,
  source: {
    schema_version: 1,
    project_id: projectId,
    source: { duration_seconds: 3 },
    video: { width: 640, height: 360, avg_frame_rate: "24/1" }
  },
  transcript: {
    schema_version: 1,
    project_id: projectId,
    language: { requested: "ar", detected: "ar" },
    segments: [
      {
        id: 1,
        words: [
          { start: 0.2, end: 0.4, text: "من", probability: 0.99 },
          { start: 0.4, end: 0.8, text: "شرقه", probability: 0.6 },
          { start: 0.8, end: 1.1, text: "يعني", probability: 0.98 },
          { start: 1.1, end: 1.4, text: "عوالية", probability: 0.64 },
          { start: 1.4, end: 1.8, text: "الحلبية", probability: 0.89 },
          { start: 1.8, end: 2.0, text: "أبو", probability: 0.79 },
          { start: 2.0, end: 2.4, text: "سرابك", probability: 0.7 }
        ]
      }
    ]
  },
  timelineMap,
  roughCutPlan: {
    schema_version: 1,
    project_id: projectId,
    source_duration_seconds: 3,
    output_duration_seconds: 3,
    carried_visual_intents: [
      {
        type: "callout",
        start: 0.2,
        end: 1.8,
        text: "من شرقه يعني عوالية الحلبية",
        reason: "ASR-derived callout",
        confidence: 0.9,
        intensity: "normal"
      },
      {
        type: "title",
        start: 1.8,
        end: 2.5,
        text: "أبو سرابك يا حلا",
        reason: "ASR-derived title",
        confidence: 0.9,
        intensity: "normal"
      }
    ]
  },
  roughCutProbe: {
    duration: 3,
    width: 640,
    height: 360,
    fps: 24,
    videoStreams: 1,
    audioStreams: 1
  },
  captionCorrections: corrections
});

assert.equal(plan.metrics.source_words, 7);
assert.equal(plan.metrics.aligned_words, 5);
assert.equal(plan.metrics.caption_words, 5);
assert.equal(plan.metrics.dropped_words, 0);
assert.deepEqual(plan.captions.words.map((word) => word.display_word_index), [0, 1, 2, 3, 4]);

const mergedDialect = plan.captions.words.find((word) => word.display_text === "عوالِي الحلبية");
assert.ok(mergedDialect);
assert.equal(mergedDialect.raw_text, "عوالية الحلبية");
assert.equal(mergedDialect.source_word_start, 3);
assert.equal(mergedDialect.source_word_end, 4);
assert.equal(mergedDialect.source_word_index, 3);

const mergedName = plan.captions.words.find((word) => word.display_text === "أبو سُرّك");
assert.ok(mergedName);
assert.equal(mergedName.raw_text, "أبو سرابك");
assert.equal(mergedName.source_word_start, 5);
assert.equal(mergedName.source_word_end, 6);

const callout = plan.visual_intents.find((intent) => intent.type === "callout");
assert.ok(callout);
assert.equal(callout.text, "من شرقه يعني عوالية الحلبية");
assert.equal(callout.display_text, "من شوقه يعني عوالِي الحلبية");

const title = plan.visual_intents.find((intent) => intent.type === "title");
assert.ok(title);
assert.equal(title.text, "أبو سرابك يا حلا");
assert.equal(title.display_text, "أبو سُرّك يا حلا");

console.log("P6-B.2 correction integration: PASS");
