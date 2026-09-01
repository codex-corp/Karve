import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeArabicBoundaryPunctuation } from "./arabic.ts";
import { buildPresentationPlan } from "./plan.ts";
import {
  mapRangeThroughTimeline,
  mapTranscriptWords,
  mapVisualIntents,
  parseFps,
  validateTimelineMap
} from "./timeline.ts";
import type { P6Config, TimelineMap } from "./types.ts";

const timelineMap: TimelineMap = {
  schema_version: 1,
  project_id: "sample",
  source_duration_seconds: 25.704458,
  output_duration_seconds: 24.424458,
  segments: [
    {
      source_start: 0,
      source_end: 20.33,
      output_start: 0,
      output_end: 20.33
    },
    {
      source_start: 21.61,
      source_end: 25.704458,
      output_start: 20.33,
      output_end: 24.424458
    }
  ]
};

validateTimelineMap(timelineMap);
assert.equal(parseFps("24000/1001"), 23.976024);
assert.equal(normalizeArabicBoundaryPunctuation("كيفك؟"), "كيفك?");
assert.equal(normalizeArabicBoundaryPunctuation("أولاً، ثانياً؛"), "أولاً, ثانياً;");
assert.deepEqual(mapRangeThroughTimeline(19.8, 22.0, timelineMap.segments), [
  { source_start: 19.8, source_end: 20.33, output_start: 19.8, output_end: 20.33 },
  { source_start: 21.61, source_end: 22, output_start: 20.33, output_end: 20.72 }
]);

const mappedWords = mapTranscriptWords(
  [
    {
      id: 1,
      words: [
        { start: 1, end: 1.5, text: "مرحبا", probability: 0.99 },
        { start: 20.5, end: 21.0, text: "محذوف", probability: 0.91 },
        { start: 22, end: 22.5, text: "اشتقنا", probability: 0.97 }
      ]
    }
  ],
  timelineMap
);
assert.equal(mappedWords.sourceWords, 3);
assert.equal(mappedWords.droppedWords, 1);
assert.equal(mappedWords.words.length, 2);
assert.equal(mappedWords.words[1].output_start, 20.72);
assert.equal(mappedWords.words[1].output_end, 21.22);

const mappedIntents = mapVisualIntents(
  [
    {
      type: "caption_emphasis",
      start: 15,
      end: 16,
      text: "شعور لا يوصف",
      reason: "important",
      confidence: 0.95,
      intensity: "strong"
    },
    {
      type: "punch_in",
      start: 23.79,
      end: 24.97,
      text: "اشتقنا لكم",
      reason: "ending",
      confidence: 0.93,
      intensity: "strong"
    },
    {
      type: "title",
      start: 19.8,
      end: 22.0,
      text: "عنوان مستمر",
      reason: "crosses a cut",
      confidence: 0.88,
      intensity: "normal"
    },
    {
      type: "explainer",
      start: 10,
      end: 12,
      text: "deferred",
      reason: "P7",
      confidence: 0.9,
      intensity: "normal"
    }
  ],
  timelineMap
);
assert.equal(mappedIntents.rendered.length, 3);
assert.equal(mappedIntents.deferred.length, 1);
assert.equal(mappedIntents.splitFragments, 1);
const splitTitle = mappedIntents.rendered.find((intent) => intent.type === "title");
assert.ok(splitTitle);
assert.equal(splitTitle.output_start, 19.8);
assert.equal(splitTitle.output_end, 20.72);
assert.equal(splitTitle.source_parts, 2);
const mappedPunch = mappedIntents.rendered.find((intent) => intent.type === "punch_in");
assert.ok(mappedPunch);
assert.equal(mappedPunch.output_start, 22.51);

const config = JSON.parse(
  readFileSync(resolve("config", "p6-profiles.json"), "utf8")
) as P6Config;
const common = {
  projectId: "sample",
  config,
  source: {
    schema_version: 1 as const,
    project_id: "sample",
    source: { duration_seconds: 25.704458 },
    video: { width: 640, height: 360, avg_frame_rate: "24000/1001" }
  },
  transcript: {
    schema_version: 1 as const,
    project_id: "sample",
    language: { requested: "ar", detected: "ar" },
    segments: [
      {
        id: 1,
        words: [
          { start: 1, end: 1.5, text: "مرحبا", probability: 0.99 },
          { start: 22, end: 22.5, text: "اشتقنا", probability: 0.97 }
        ]
      }
    ]
  },
  timelineMap,
  roughCutPlan: {
    schema_version: 1 as const,
    project_id: "sample",
    source_duration_seconds: 25.704458,
    output_duration_seconds: 24.424458,
    carried_visual_intents: [
      {
        type: "punch_in" as const,
        start: 23.79,
        end: 24.97,
        text: "اشتقنا لكم",
        reason: "ending",
        confidence: 0.93,
        intensity: "strong" as const
      }
    ]
  },
  roughCutProbe: {
    duration: 24.448005,
    width: 640,
    height: 360,
    fps: 24000 / 1001,
    videoStreams: 1,
    audioStreams: 1
  }
};

const plan = buildPresentationPlan({ ...common, profileName: "source" });
assert.equal(plan.canvas.width, 640);
assert.equal(plan.canvas.height, 360);
assert.equal(plan.captions.direction, "rtl");
assert.equal(plan.captions.font_size, 30);
assert.equal(plan.visual_intents[0].output_start, 22.51);
assert.equal(plan.canvas.duration_in_frames, Math.ceil(24.424458 * (24000 / 1001)));

const reel = buildPresentationPlan({ ...common, profileName: "reel" });
assert.equal(reel.canvas.width, 1080);
assert.equal(reel.canvas.height, 1920);
assert.equal(reel.media.layout, "contain_blur");
assert.equal(reel.captions.font_size, 74);

console.log("P6 presentation/timeline logic: PASS");
