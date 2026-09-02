import type {
  CaptionWord,
  RemappedVisualIntent,
  TimelineMap,
  TimelineMapSegment,
  VisualIntentType,
  VisualIntensity
} from "./types.ts";

export const EPS = 1e-6;

export type TranscriptWordInput = {
  start: number;
  end: number;
  text: string;
  probability: number;
};

export type TranscriptSegmentInput = {
  id: number;
  words: TranscriptWordInput[];
};

export type VisualIntentInput = {
  type: VisualIntentType;
  start: number;
  end: number;
  text: string;
  display_text?: string;
  reason: string;
  confidence: number;
  intensity: VisualIntensity;
};

export type MappedFragment = {
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
};

export function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isFiniteRange(start: number, end: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && end > start + EPS;
}

export function validateTimelineMap(map: TimelineMap): void {
  if (map.schema_version !== 1) {
    throw new Error("P6 currently supports timeline-map schema_version 1 only");
  }
  if (!Number.isFinite(map.source_duration_seconds) || map.source_duration_seconds <= 0) {
    throw new Error("timeline-map source duration is invalid");
  }
  if (!Number.isFinite(map.output_duration_seconds) || map.output_duration_seconds <= 0) {
    throw new Error("timeline-map output duration is invalid");
  }
  if (!Array.isArray(map.segments) || map.segments.length === 0) {
    throw new Error("timeline-map has no kept segments");
  }

  let previousSourceEnd = 0;
  let previousOutputEnd = 0;
  map.segments.forEach((segment, index) => {
    if (
      !isFiniteRange(segment.source_start, segment.source_end) ||
      !isFiniteRange(segment.output_start, segment.output_end)
    ) {
      throw new Error(`timeline-map segment ${index} has an invalid range`);
    }
    if (segment.source_start < previousSourceEnd - EPS) {
      throw new Error(`timeline-map segment ${index} overlaps the previous source segment`);
    }
    if (Math.abs(segment.output_start - previousOutputEnd) > 1e-4) {
      throw new Error(`timeline-map output is not contiguous at segment ${index}`);
    }
    const sourceLength = segment.source_end - segment.source_start;
    const outputLength = segment.output_end - segment.output_start;
    if (Math.abs(sourceLength - outputLength) > 1e-4) {
      throw new Error(`timeline-map segment ${index} changes playback speed`);
    }
    if (segment.source_end > map.source_duration_seconds + 1e-4) {
      throw new Error(`timeline-map segment ${index} exceeds source duration`);
    }
    previousSourceEnd = segment.source_end;
    previousOutputEnd = segment.output_end;
  });

  if (Math.abs(previousOutputEnd - map.output_duration_seconds) > 1e-4) {
    throw new Error("timeline-map output duration does not match its final segment");
  }
}

export function mapRangeThroughTimeline(
  start: number,
  end: number,
  segments: TimelineMapSegment[]
): MappedFragment[] {
  if (!isFiniteRange(start, end)) {
    return [];
  }

  const fragments: MappedFragment[] = [];
  for (const segment of segments) {
    const sourceStart = Math.max(start, segment.source_start);
    const sourceEnd = Math.min(end, segment.source_end);
    if (sourceEnd <= sourceStart + EPS) {
      continue;
    }
    const outputStart = segment.output_start + (sourceStart - segment.source_start);
    const outputEnd = segment.output_start + (sourceEnd - segment.source_start);
    fragments.push({
      source_start: round6(sourceStart),
      source_end: round6(sourceEnd),
      output_start: round6(outputStart),
      output_end: round6(outputEnd)
    });
  }
  return fragments;
}

function segmentContainingMidpoint(
  start: number,
  end: number,
  segments: TimelineMapSegment[]
): TimelineMapSegment | null {
  const midpoint = start + (end - start) / 2;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    if (
      midpoint >= segment.source_start - EPS &&
      (midpoint < segment.source_end - EPS || (isLast && midpoint <= segment.source_end + EPS))
    ) {
      return segment;
    }
  }
  return null;
}

export function mapTranscriptWords(
  transcriptSegments: TranscriptSegmentInput[],
  map: TimelineMap
): { words: CaptionWord[]; sourceWords: number; droppedWords: number; trimmedWords: number } {
  validateTimelineMap(map);

  const words: CaptionWord[] = [];
  let sourceWords = 0;
  let droppedWords = 0;
  let trimmedWords = 0;

  for (const transcriptSegment of transcriptSegments) {
    for (const sourceWord of transcriptSegment.words || []) {
      const sourceWordIndex = sourceWords;
      sourceWords += 1;
      const text = String(sourceWord.text || "").trim();
      if (!text || !isFiniteRange(sourceWord.start, sourceWord.end)) {
        droppedWords += 1;
        continue;
      }

      const segment = segmentContainingMidpoint(sourceWord.start, sourceWord.end, map.segments);
      if (!segment) {
        droppedWords += 1;
        continue;
      }

      const retainedStart = Math.max(sourceWord.start, segment.source_start);
      const retainedEnd = Math.min(sourceWord.end, segment.source_end);
      if (retainedEnd <= retainedStart + EPS) {
        droppedWords += 1;
        continue;
      }

      const sourceDuration = sourceWord.end - sourceWord.start;
      const retainedDuration = retainedEnd - retainedStart;
      const retainedFraction = retainedDuration / sourceDuration;
      const trimmed = retainedFraction < 0.999;
      if (trimmed) {
        trimmedWords += 1;
      }

      words.push({
        source_word_index: sourceWordIndex,
        display_word_index: sourceWordIndex,
        source_word_start: sourceWordIndex,
        source_word_end: sourceWordIndex,
        source_segment_id: transcriptSegment.id,
        text,
        raw_text: text,
        display_text: text,
        probability: round6(Number.isFinite(sourceWord.probability) ? sourceWord.probability : 0),
        source_start: round6(retainedStart),
        source_end: round6(retainedEnd),
        output_start: round6(segment.output_start + (retainedStart - segment.source_start)),
        output_end: round6(segment.output_start + (retainedEnd - segment.source_start)),
        retained_fraction: round6(retainedFraction),
        trimmed_by_cut: trimmed
      });
    }
  }

  words.sort((a, b) => a.output_start - b.output_start || a.output_end - b.output_end);
  return { words, sourceWords, droppedWords, trimmedWords };
}

export type AlignedWordInput = {
  text: string;
  raw_text?: string;
  start: number;
  end: number;
  probability: number;
  segment_id: number;
  /** Preferred P6-B.2 provenance fields. Legacy global_index remains accepted for old callers/tests. */
  display_word_index?: number;
  source_word_start?: number;
  source_word_end?: number;
  global_index?: number;
};

export function mapAlignedWords(
  alignedWords: AlignedWordInput[],
  map: TimelineMap
): { words: CaptionWord[]; alignedWords: number; droppedWords: number; trimmedWords: number } {
  validateTimelineMap(map);

  const words: CaptionWord[] = [];
  const alignedWordCount = alignedWords.length;
  let droppedWords = 0;
  let trimmedWords = 0;

  for (let index = 0; index < alignedWords.length; index += 1) {
    const sourceWord = alignedWords[index];
    const text = String(sourceWord.text || "").trim();
    const rawText = String(sourceWord.raw_text || text).trim();
    const displayWordIndex = sourceWord.display_word_index ?? index;
    const sourceWordStart = sourceWord.source_word_start ?? sourceWord.global_index ?? index;
    const sourceWordEnd = sourceWord.source_word_end ?? sourceWordStart;
    if (!text || !rawText || !isFiniteRange(sourceWord.start, sourceWord.end)) {
      droppedWords += 1;
      continue;
    }
    if (
      !Number.isInteger(displayWordIndex) ||
      displayWordIndex < 0 ||
      !Number.isInteger(sourceWordStart) ||
      !Number.isInteger(sourceWordEnd) ||
      sourceWordStart < 0 ||
      sourceWordEnd < sourceWordStart
    ) {
      throw new Error("Aligned word has invalid provenance indexes");
    }

    const segment = segmentContainingMidpoint(sourceWord.start, sourceWord.end, map.segments);
    if (!segment) {
      droppedWords += 1;
      continue;
    }

    const retainedStart = Math.max(sourceWord.start, segment.source_start);
    const retainedEnd = Math.min(sourceWord.end, segment.source_end);
    if (retainedEnd <= retainedStart + EPS) {
      droppedWords += 1;
      continue;
    }

    const sourceDuration = sourceWord.end - sourceWord.start;
    const retainedDuration = retainedEnd - retainedStart;
    const retainedFraction = retainedDuration / sourceDuration;
    const trimmed = retainedFraction < 0.999;
    if (trimmed) {
      trimmedWords += 1;
    }

    words.push({
      source_word_index: sourceWordStart,
      display_word_index: displayWordIndex,
      source_word_start: sourceWordStart,
      source_word_end: sourceWordEnd,
      source_segment_id: sourceWord.segment_id,
      text,
      raw_text: rawText,
      display_text: text,
      probability: round6(Number.isFinite(sourceWord.probability) ? sourceWord.probability : 0),
      source_start: round6(retainedStart),
      source_end: round6(retainedEnd),
      output_start: round6(segment.output_start + (retainedStart - segment.source_start)),
      output_end: round6(segment.output_start + (retainedEnd - segment.source_start)),
      retained_fraction: round6(retainedFraction),
      trimmed_by_cut: trimmed
    });
  }

  words.sort((a, b) => a.output_start - b.output_start || a.output_end - b.output_end);
  return { words, alignedWords: alignedWordCount, droppedWords, trimmedWords };
}

export function mapVisualIntents(
  intents: VisualIntentInput[],
  map: TimelineMap
): {
  rendered: RemappedVisualIntent[];
  deferred: RemappedVisualIntent[];
  dropped: number;
  splitFragments: number;
} {
  validateTimelineMap(map);
  const rendered: RemappedVisualIntent[] = [];
  const deferred: RemappedVisualIntent[] = [];
  let dropped = 0;
  let splitFragments = 0;

  intents.forEach((intent, intentIndex) => {
    const fragments = mapRangeThroughTimeline(intent.start, intent.end, map.segments);
    if (fragments.length === 0) {
      dropped += 1;
      return;
    }

    splitFragments += Math.max(0, fragments.length - 1);
    const first = fragments[0];
    const last = fragments[fragments.length - 1];
    const text = String(intent.text || "").trim();
    const displayText = String(intent.display_text || "").trim();
    const mapped: RemappedVisualIntent = {
      id: `visual-${String(intentIndex + 1).padStart(3, "0")}-1`,
      type: intent.type,
      source_start: first.source_start,
      source_end: last.source_end,
      output_start: first.output_start,
      output_end: last.output_end,
      text,
      ...(displayText && displayText !== text ? { display_text: displayText } : {}),
      reason: String(intent.reason || "").trim(),
      confidence: round6(Number.isFinite(intent.confidence) ? intent.confidence : 0),
      intensity: intent.intensity,
      source_part: 1,
      source_parts: fragments.length
    };

    // Removed source gaps collapse on the P5 output timeline. Keeping one
    // continuous output intent avoids a zoom/card fade-out and fade-in exactly
    // on a jump cut, while source_parts records that the mapping crossed cuts.
    if (intent.type === "explainer") {
      deferred.push(mapped);
    } else {
      rendered.push(mapped);
    }
  });

  const byOutputTime = (a: RemappedVisualIntent, b: RemappedVisualIntent): number =>
    a.output_start - b.output_start || a.output_end - b.output_end || a.id.localeCompare(b.id);
  rendered.sort(byOutputTime);
  deferred.sort(byOutputTime);
  return { rendered, deferred, dropped, splitFragments };
}

export function parseFps(value: string | number | undefined): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0 || value > 120) {
      throw new Error(`Invalid FPS: ${String(value)}`);
    }
    return round6(value);
  }
  const raw = String(value || "").trim();
  const rational = raw.match(/^([0-9]+(?:\.[0-9]+)?)\/([0-9]+(?:\.[0-9]+)?)$/);
  if (rational) {
    const numerator = Number(rational[1]);
    const denominator = Number(rational[2]);
    if (numerator > 0 && denominator > 0) {
      return parseFps(numerator / denominator);
    }
  }
  return parseFps(Number(raw));
}

export function isRtlLanguage(language: string): boolean {
  const normalized = language.toLowerCase().split(/[-_]/)[0];
  return ["ar", "fa", "he", "ur", "ps", "sd", "ug", "yi"].includes(normalized);
}
