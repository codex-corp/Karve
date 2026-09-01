export type IntervalSource = "semantic" | "auto_editor";

export type Interval = {
  start: number;
  end: number;
  sources: IntervalSource[];
  reason_codes?: string[];
};

export type AutoEditorV1 = {
  version: "1";
  source: string;
  timebase?: string;
  chunks: Array<[number, number, number]>;
};

export type TimelineMapSegment = {
  source_start: number;
  source_end: number;
  output_start: number;
  output_end: number;
};

const EPS = 1e-6;

export function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseTimebase(value: string | undefined): number {
  const raw = value || "30/1";
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\/([0-9]+(?:\.[0-9]+)?)$/);
  if (!match) {
    throw new Error(`Invalid auto-editor v1 timebase: ${raw}`);
  }
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) {
    throw new Error(`Invalid auto-editor v1 timebase: ${raw}`);
  }
  return num / den;
}

export function autoEditorCuts(v1: AutoEditorV1, duration: number): Interval[] {
  if (v1.version !== "1" || !Array.isArray(v1.chunks)) {
    throw new Error("Invalid auto-editor v1 timeline");
  }
  const tbf = parseTimebase(v1.timebase);
  const result: Interval[] = [];
  for (const chunk of v1.chunks) {
    if (!Array.isArray(chunk) || chunk.length !== 3) {
      throw new Error("Invalid auto-editor v1 chunk");
    }
    const [startTick, endTick, speed] = chunk;
    if (![startTick, endTick, speed].every(Number.isFinite) || endTick < startTick) {
      throw new Error("Invalid auto-editor v1 chunk values");
    }
    if (speed !== 0 && speed !== 99999) {
      continue;
    }
    const start = clamp(startTick / tbf, 0, duration);
    const end = clamp(endTick / tbf, 0, duration);
    if (end - start > EPS) {
      result.push({ start: round6(start), end: round6(end), sources: ["auto_editor"] });
    }
  }
  return result;
}

export function normalizeIntervals(
  intervals: Interval[],
  duration: number,
  adjacentGap: number = 0
): Interval[] {
  const clean = intervals
    .map((item) => ({
      start: clamp(item.start, 0, duration),
      end: clamp(item.end, 0, duration),
      sources: [...new Set(item.sources)].sort() as IntervalSource[],
      reason_codes: item.reason_codes ? [...new Set(item.reason_codes)].sort() : undefined
    }))
    .filter((item) => item.end - item.start > EPS)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: Interval[] = [];
  for (const item of clean) {
    const last = out[out.length - 1];
    if (!last || item.start > last.end + adjacentGap + EPS) {
      out.push({
        start: round6(item.start),
        end: round6(item.end),
        sources: [...item.sources],
        reason_codes: item.reason_codes ? [...item.reason_codes] : undefined
      });
      continue;
    }
    last.end = round6(Math.max(last.end, item.end));
    last.sources = [...new Set([...last.sources, ...item.sources])].sort() as IntervalSource[];
    const reasons = [...(last.reason_codes || []), ...(item.reason_codes || [])];
    last.reason_codes = reasons.length ? [...new Set(reasons)].sort() : undefined;
  }
  return out;
}

export function shrinkIntervals(
  intervals: Interval[],
  margin: number,
  duration: number,
  adjacentGap: number = 0
): Interval[] {
  const merged = normalizeIntervals(intervals, duration, adjacentGap);
  return normalizeIntervals(
    merged.map((item) => ({
      ...item,
      start: item.start <= EPS ? 0 : item.start + margin,
      end: item.end >= duration - EPS ? duration : item.end - margin
    })),
    duration,
    0
  );
}

export function expandSimpleRanges(
  ranges: Array<{ start: number; end: number }>,
  margin: number,
  duration: number
): Array<{ start: number; end: number }> {
  return ranges
    .map((item) => ({
      start: round6(clamp(item.start - margin, 0, duration)),
      end: round6(clamp(item.end + margin, 0, duration))
    }))
    .filter((item) => item.end - item.start > EPS)
    .sort((a, b) => a.start - b.start);
}

export function subtractProtection(
  intervals: Interval[],
  protectedRanges: Array<{ start: number; end: number }>,
  duration: number
): Interval[] {
  let current = normalizeIntervals(intervals, duration, 0);
  const protectedSorted = expandSimpleRanges(protectedRanges, 0, duration);

  for (const protect of protectedSorted) {
    const next: Interval[] = [];
    for (const item of current) {
      if (protect.end <= item.start + EPS || protect.start >= item.end - EPS) {
        next.push(item);
        continue;
      }
      if (protect.start > item.start + EPS) {
        next.push({
          ...item,
          end: round6(Math.min(item.end, protect.start)),
          sources: [...item.sources],
          reason_codes: item.reason_codes ? [...item.reason_codes] : undefined
        });
      }
      if (protect.end < item.end - EPS) {
        next.push({
          ...item,
          start: round6(Math.max(item.start, protect.end)),
          sources: [...item.sources],
          reason_codes: item.reason_codes ? [...item.reason_codes] : undefined
        });
      }
    }
    current = next.filter((item) => item.end - item.start > EPS);
  }
  return normalizeIntervals(current, duration, 0);
}

export function filterAutoMicroCuts(intervals: Interval[], minAutoCut: number): Interval[] {
  return intervals.filter((item) => {
    const hasSemantic = item.sources.includes("semantic");
    return hasSemantic || item.end - item.start + EPS >= minAutoCut;
  });
}

export function complementCuts(cuts: Interval[], duration: number): Array<{ start: number; end: number }> {
  const normalized = normalizeIntervals(cuts, duration, 0);
  const keep: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const cut of normalized) {
    if (cut.start > cursor + EPS) {
      keep.push({ start: round6(cursor), end: round6(cut.start) });
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < duration - EPS) {
    keep.push({ start: round6(cursor), end: round6(duration) });
  }
  return keep.filter((item) => item.end - item.start > EPS);
}

export function buildTimelineMap(
  kept: Array<{ start: number; end: number }>
): { segments: TimelineMapSegment[]; outputDuration: number } {
  let outputCursor = 0;
  const segments: TimelineMapSegment[] = [];
  for (const item of kept) {
    const length = item.end - item.start;
    const outputStart = outputCursor;
    const outputEnd = outputCursor + length;
    segments.push({
      source_start: round6(item.start),
      source_end: round6(item.end),
      output_start: round6(outputStart),
      output_end: round6(outputEnd)
    });
    outputCursor = outputEnd;
  }
  return { segments, outputDuration: round6(outputCursor) };
}

export function validateCoverage(
  cuts: Interval[],
  kept: Array<{ start: number; end: number }>,
  duration: number
): void {
  const pieces = [
    ...cuts.map((item) => ({ start: item.start, end: item.end, kind: "cut" })),
    ...kept.map((item) => ({ start: item.start, end: item.end, kind: "keep" }))
  ].sort((a, b) => a.start - b.start || a.end - b.end);
  if (pieces.length === 0) {
    throw new Error("Timeline has no cut or keep pieces");
  }
  let cursor = 0;
  for (const item of pieces) {
    if (Math.abs(item.start - cursor) > 1e-4) {
      throw new Error(`Timeline coverage gap/overlap near ${cursor.toFixed(6)}s`);
    }
    if (item.end <= item.start + EPS) {
      throw new Error("Timeline contains empty range");
    }
    cursor = item.end;
  }
  if (Math.abs(cursor - duration) > 1e-4) {
    throw new Error(`Timeline coverage ends at ${cursor.toFixed(6)}s, expected ${duration.toFixed(6)}s`);
  }
}
