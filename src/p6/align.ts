/**
 * Deterministic caption correction aligner.
 *
 * Takes raw transcript words and sparse caption corrections, then produces
 * display-ready words with corrected text and properly distributed timings.
 *
 * Rules:
 *   - transcript.json is immutable; all corrections are additive overlays.
 *   - Corrections must not overlap.
 *   - Timing is distributed deterministically:
 *       1:1  → exact same timing
 *       N:1  → union of source word timings
 *       1:N  → proportional split of the single word duration
 *       N:M  → proportional distribution across the source span
 *   - Insertions without source speech are forbidden.
 *   - Empty replacements (deletions) are forbidden in V1.
 */

export type TranscriptWord = {
  text: string;
  start: number;
  end: number;
  probability: number;
  segment_id: number;
  global_index: number;
};

export type CaptionCorrection = {
  source_word_start: number;
  source_word_end: number;
  original_text: string;
  replacement: string[];
  reason: string;
  confidence: number;
};

export type CaptionCorrections = {
  schema_version: 1;
  project_id: string;
  corrections: CaptionCorrection[];
};

export type DisplayWord = {
  /** The text to show on screen (corrected or original). */
  display_text: string;
  /** The original raw ASR text. */
  raw_text: string;
  /** Whether this word was corrected. */
  corrected: boolean;
  /** Correction confidence (1.0 if not corrected). */
  correction_confidence: number;
  /** Output-timeline start in seconds. */
  start: number;
  /** Output-timeline end in seconds. */
  end: number;
  /** ASR probability of the original word. */
  probability: number;
  /** Source segment id. */
  segment_id: number;
  /** Global word index in the original transcript. */
  global_index: number;
};

export type AlignmentResult = {
  words: DisplayWord[];
  corrections_applied: number;
  corrections_skipped: number;
  flagged_for_review: CaptionCorrection[];
};

function fail(message: string): never {
  throw new Error(message);
}

/**
 * Validate that corrections do not overlap and are within bounds.
 */
function validateCorrections(
  corrections: CaptionCorrection[],
  wordCount: number
): void {
  const sorted = [...corrections].sort(
    (a, b) => a.source_word_start - b.source_word_start
  );

  let previousEnd = -1;
  for (const correction of sorted) {
    if (correction.source_word_start < 0 || correction.source_word_end >= wordCount) {
      fail(
        `Correction range [${correction.source_word_start}, ${correction.source_word_end}] ` +
          `is out of bounds (word count: ${wordCount})`
      );
    }
    if (correction.source_word_start > correction.source_word_end) {
      fail(
        `Correction has inverted range: ` +
          `[${correction.source_word_start}, ${correction.source_word_end}]`
      );
    }
    if (correction.source_word_start <= previousEnd) {
      fail(
        `Corrections overlap at word index ${correction.source_word_start} ` +
          `(previous correction ended at ${previousEnd})`
      );
    }
    if (correction.replacement.length === 0) {
      fail(
        `Correction at [${correction.source_word_start}, ${correction.source_word_end}] ` +
          `has empty replacement (deletions are forbidden in V1)`
      );
    }
    previousEnd = correction.source_word_end;
  }
}

/**
 * Distribute a time span [spanStart, spanEnd] proportionally across N replacement words.
 * Each word gets an equal share of the duration.
 */
function distributeTimings(
  spanStart: number,
  spanEnd: number,
  count: number
): Array<{ start: number; end: number }> {
  if (count <= 0) {
    fail("Cannot distribute timings across zero words");
  }
  if (count === 1) {
    return [{ start: spanStart, end: spanEnd }];
  }
  const duration = spanEnd - spanStart;
  const step = duration / count;
  const result: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < count; i++) {
    result.push({
      start: round6(spanStart + i * step),
      end: round6(spanStart + (i + 1) * step)
    });
  }
  // Ensure last word ends exactly at spanEnd.
  result[result.length - 1].end = spanEnd;
  return result;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Build a global flat word list from transcript segments.
 */
export function flattenTranscriptWords(
  segments: Array<{
    id: number;
    words: Array<{
      text: string;
      start: number;
      end: number;
      probability: number;
    }>;
  }>
): TranscriptWord[] {
  const words: TranscriptWord[] = [];
  let globalIndex = 0;
  for (const segment of segments) {
    for (const word of segment.words) {
      words.push({
        text: word.text,
        start: word.start,
        end: word.end,
        probability: word.probability,
        segment_id: segment.id,
        global_index: globalIndex
      });
      globalIndex++;
    }
  }
  return words;
}

/**
 * Apply sparse corrections to transcript words and produce display-ready words.
 *
 * @param words     - Flat list of transcript words (from flattenTranscriptWords).
 * @param corrections - The corrections object (may be null/undefined if no corrections exist).
 * @param projectId - Expected project id for validation.
 * @returns Aligned display words with corrected text and distributed timings.
 */
export function applyCorrections(
  words: TranscriptWord[],
  corrections: CaptionCorrections | null | undefined,
  projectId: string
): AlignmentResult {
  // No corrections: pass through all words unchanged.
  if (!corrections || corrections.corrections.length === 0) {
    return {
      words: words.map((word) => ({
        display_text: word.text,
        raw_text: word.text,
        corrected: false,
        correction_confidence: 1.0,
        start: word.start,
        end: word.end,
        probability: word.probability,
        segment_id: word.segment_id,
        global_index: word.global_index
      })),
      corrections_applied: 0,
      corrections_skipped: 0,
      flagged_for_review: []
    };
  }

  // Validate project id.
  if (corrections.project_id !== projectId) {
    fail(
      `caption-corrections.json project_id '${corrections.project_id}' ` +
        `does not match project '${projectId}'`
    );
  }
  if (corrections.schema_version !== 1) {
    fail("caption-corrections.json schema_version must be 1");
  }

  validateCorrections(corrections.corrections, words.length);

  // Index corrections by start word for O(1) lookup.
  const correctionByStart = new Map<number, CaptionCorrection>();
  const correctedIndexes = new Set<number>();
  for (const correction of corrections.corrections) {
    correctionByStart.set(correction.source_word_start, correction);
    for (let i = correction.source_word_start; i <= correction.source_word_end; i++) {
      correctedIndexes.add(i);
    }
  }

  const result: DisplayWord[] = [];
  const flagged: CaptionCorrection[] = [];
  let applied = 0;
  let skipped = 0;
  let wordIndex = 0;

  while (wordIndex < words.length) {
    const correction = correctionByStart.get(wordIndex);

    if (!correction) {
      // No correction at this index — pass through if not part of a range.
      if (!correctedIndexes.has(wordIndex)) {
        const word = words[wordIndex];
        result.push({
          display_text: word.text,
          raw_text: word.text,
          corrected: false,
          correction_confidence: 1.0,
          start: word.start,
          end: word.end,
          probability: word.probability,
          segment_id: word.segment_id,
          global_index: word.global_index
        });
      }
      wordIndex++;
      continue;
    }

    // We have a correction starting at this index.
    const sourceStart = correction.source_word_start;
    const sourceEnd = correction.source_word_end;
    const sourceCount = sourceEnd - sourceStart + 1;
    const replacementCount = correction.replacement.length;

    // Validate original_text matches.
    const originalWords = words.slice(sourceStart, sourceEnd + 1);
    const originalConcat = originalWords.map((w) => w.text).join(" ");
    if (originalConcat !== correction.original_text) {
      console.warn(
        `WARNING: Correction original_text mismatch at [${sourceStart}, ${sourceEnd}]: ` +
          `expected '${correction.original_text}', got '${originalConcat}'. Skipping.`
      );
      // Pass through original words unchanged.
      for (const word of originalWords) {
        result.push({
          display_text: word.text,
          raw_text: word.text,
          corrected: false,
          correction_confidence: 1.0,
          start: word.start,
          end: word.end,
          probability: word.probability,
          segment_id: word.segment_id,
          global_index: word.global_index
        });
      }
      skipped++;
      wordIndex = sourceEnd + 1;
      continue;
    }

    // Flag low-confidence corrections.
    if (correction.confidence < 0.7) {
      flagged.push(correction);
    }

    // Compute the span timing.
    const spanStart = originalWords[0].start;
    const spanEnd = originalWords[originalWords.length - 1].end;
    const avgProbability =
      originalWords.reduce((sum, w) => sum + w.probability, 0) / sourceCount;

    // Distribute timings across replacement words.
    const timings = distributeTimings(spanStart, spanEnd, replacementCount);

    for (let i = 0; i < replacementCount; i++) {
      result.push({
        display_text: correction.replacement[i],
        raw_text: i < sourceCount ? originalWords[i].text : originalConcat,
        corrected: true,
        correction_confidence: correction.confidence,
        start: timings[i].start,
        end: timings[i].end,
        probability: avgProbability,
        segment_id: originalWords[0].segment_id,
        global_index: sourceStart + Math.min(i, sourceCount - 1)
      });
    }

    applied++;
    wordIndex = sourceEnd + 1;
  }

  return {
    words: result,
    corrections_applied: applied,
    corrections_skipped: skipped,
    flagged_for_review: flagged
  };
}
