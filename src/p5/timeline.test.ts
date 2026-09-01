import assert from "node:assert/strict";
import {
  autoEditorCuts,
  buildTimelineMap,
  complementCuts,
  expandSimpleRanges,
  filterAutoMicroCuts,
  normalizeIntervals,
  shrinkIntervals,
  subtractProtection,
  validateCoverage,
  type AutoEditorV1,
  type Interval
} from "./timeline.ts";

const v1: AutoEditorV1 = {
  version: "1",
  source: "audio.wav",
  timebase: "30/1",
  chunks: [
    [0, 30, 1],
    [30, 45, 0],
    [45, 90, 1],
    [90, 120, 0]
  ]
};

const auto = autoEditorCuts(v1, 4);
assert.deepEqual(auto, [
  { start: 1, end: 1.5, sources: ["auto_editor"] },
  { start: 3, end: 4, sources: ["auto_editor"] }
]);

const semantic: Interval[] = [
  { start: 0.5, end: 1.2, sources: ["semantic"], reason_codes: ["false_start"] },
  { start: 1.2, end: 2.0, sources: ["semantic"], reason_codes: ["false_start"] }
];
const shrunk = shrinkIntervals(semantic, 0.08, 4, 0.05);
assert.equal(shrunk.length, 1);
assert.equal(shrunk[0].start, 0.58);
assert.equal(shrunk[0].end, 1.92);

const protectedRanges = expandSimpleRanges([{ start: 3.2, end: 3.6 }], 0.1, 4);
const protectedAuto = subtractProtection(auto, protectedRanges, 4);
assert.deepEqual(protectedAuto, [
  { start: 1, end: 1.5, sources: ["auto_editor"], reason_codes: undefined },
  { start: 3, end: 3.1, sources: ["auto_editor"], reason_codes: undefined },
  { start: 3.7, end: 4, sources: ["auto_editor"], reason_codes: undefined }
]);

const filtered = filterAutoMicroCuts(protectedAuto, 0.18);
assert.equal(filtered.length, 2);

const finalCuts = normalizeIntervals([...shrunk, ...filtered], 4, 0.05);
const kept = complementCuts(finalCuts, 4);
validateCoverage(finalCuts, kept, 4);
const mapped = buildTimelineMap(kept);
assert.ok(mapped.outputDuration > 0);
assert.equal(mapped.segments[0].output_start, 0);
for (let i = 1; i < mapped.segments.length; i += 1) {
  assert.equal(mapped.segments[i].output_start, mapped.segments[i - 1].output_end);
}

console.log("P5 timeline logic test: PASS");
