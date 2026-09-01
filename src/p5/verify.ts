import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type Args = { project: string };
type Range = { start: number; end: number; duration?: number };
type Cut = Range & { sources: string[]; reason_codes: string[] };
type Plan = {
  schema_version: number;
  project_id: string;
  source_duration_seconds: number;
  output_duration_seconds: number;
  final_cuts: Cut[];
  kept_ranges: Range[];
};
type MapArtifact = {
  schema_version: number;
  project_id: string;
  source_duration_seconds: number;
  output_duration_seconds: number;
  segments: Array<{
    source_start: number;
    source_end: number;
    output_start: number;
    output_end: number;
  }>;
};
type Meta = {
  schema_version: number;
  project_id: string;
  input_artifacts_sha256: {
    source_json: string;
    transcript_json: string;
    edit_plan_json: string;
  };
  rendered: boolean;
  planned_output_duration_seconds: number;
};

const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const EPS = 1e-4;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Args {
  if (argv.length !== 2 || argv[0] !== "--project" || !PROJECT_RE.test(argv[1] || "")) {
    fail("Usage: node src/p5/verify.ts --project <project-id>");
  }
  return { project: argv[1] };
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${String(error)}`);
  }
}

function sha256(path: string): string {
  const result = spawnSync("sha256sum", [path], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(`sha256sum failed for ${path}: ${(result.stderr || "").trim()}`);
  }
  const digest = (result.stdout || "").trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    fail(`Invalid sha256sum output for ${path}`);
  }
  return digest;
}

function ffprobeDuration(path: string): number {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    fail(`ffprobe failed for ${path}: ${(result.stderr || "").trim()}`);
  }
  const value = Number((result.stdout || "").trim());
  if (!Number.isFinite(value) || value <= 0) {
    fail(`Invalid rough-cut duration from ffprobe: ${String(value)}`);
  }
  return value;
}

function streamCounts(path: string): { video: number; audio: number } {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    fail(`ffprobe stream check failed: ${(result.stderr || "").trim()}`);
  }
  const lines = (result.stdout || "").trim().split(/\r?\n/).filter(Boolean);
  return {
    video: lines.filter((line) => line === "video").length,
    audio: lines.filter((line) => line === "audio").length
  };
}

function validateRanges(plan: Plan): void {
  let lastEnd = 0;
  for (const cut of plan.final_cuts) {
    if (!(cut.start >= -EPS && cut.end > cut.start + EPS && cut.end <= plan.source_duration_seconds + EPS)) {
      fail(`Invalid final cut ${cut.start}-${cut.end}`);
    }
    if (cut.start < lastEnd - EPS) {
      fail("Final cuts overlap or are unsorted");
    }
    lastEnd = cut.end;
  }
  lastEnd = 0;
  for (const keep of plan.kept_ranges) {
    if (!(keep.start >= -EPS && keep.end > keep.start + EPS && keep.end <= plan.source_duration_seconds + EPS)) {
      fail(`Invalid kept range ${keep.start}-${keep.end}`);
    }
    if (keep.start < lastEnd - EPS) {
      fail("Kept ranges overlap or are unsorted");
    }
    lastEnd = keep.end;
  }

  const pieces = [
    ...plan.final_cuts.map((item) => ({ start: item.start, end: item.end })),
    ...plan.kept_ranges.map((item) => ({ start: item.start, end: item.end }))
  ].sort((a, b) => a.start - b.start || a.end - b.end);
  let cursor = 0;
  for (const piece of pieces) {
    if (Math.abs(piece.start - cursor) > EPS) {
      fail(`Cut/keep coverage mismatch near ${cursor}`);
    }
    cursor = piece.end;
  }
  if (Math.abs(cursor - plan.source_duration_seconds) > EPS) {
    fail("Cut/keep coverage does not reach source duration");
  }
}

function validateMap(plan: Plan, map: MapArtifact): void {
  if (map.segments.length !== plan.kept_ranges.length) {
    fail("timeline-map segment count does not match kept range count");
  }
  let outputCursor = 0;
  map.segments.forEach((segment, index) => {
    const keep = plan.kept_ranges[index];
    if (
      Math.abs(segment.source_start - keep.start) > EPS ||
      Math.abs(segment.source_end - keep.end) > EPS
    ) {
      fail(`timeline-map source segment ${index} does not match kept range`);
    }
    if (Math.abs(segment.output_start - outputCursor) > EPS) {
      fail(`timeline-map output segment ${index} is not contiguous`);
    }
    const sourceLength = segment.source_end - segment.source_start;
    const outputLength = segment.output_end - segment.output_start;
    if (Math.abs(sourceLength - outputLength) > EPS) {
      fail(`timeline-map segment ${index} changes duration unexpectedly`);
    }
    outputCursor = segment.output_end;
  });
  if (Math.abs(outputCursor - plan.output_duration_seconds) > EPS) {
    fail("timeline-map output duration does not match rough-cut plan");
  }
  if (Math.abs(map.output_duration_seconds - plan.output_duration_seconds) > EPS) {
    fail("timeline-map top-level output duration mismatch");
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const dataRoot = resolve(process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", args.project);
  const paths = {
    source: join(projectDir, "source.json"),
    transcript: join(projectDir, "transcript.json"),
    editPlan: join(projectDir, "edit-plan.json"),
    plan: join(projectDir, "rough-cut-plan.json"),
    map: join(projectDir, "timeline-map.json"),
    meta: join(projectDir, "rough-cut.meta.json"),
    autoTimeline: join(projectDir, "auto-editor-silence.v1"),
    video: join(projectDir, "rough-cut.mp4")
  };
  for (const path of Object.values(paths)) {
    if (!existsSync(path)) {
      fail(`Missing P5 verification artifact: ${path}`);
    }
  }

  const plan = readJson<Plan>(paths.plan);
  const map = readJson<MapArtifact>(paths.map);
  const meta = readJson<Meta>(paths.meta);
  if (plan.schema_version !== 1 || map.schema_version !== 1 || meta.schema_version !== 1) {
    fail("P5 verification supports schema_version 1 only");
  }
  if (plan.project_id !== args.project || map.project_id !== args.project || meta.project_id !== args.project) {
    fail("P5 project id mismatch");
  }
  if (!meta.rendered) {
    fail("P5 meta indicates plan-only output; render the rough cut before verification");
  }

  validateRanges(plan);
  validateMap(plan, map);

  const expectedHashes = meta.input_artifacts_sha256;
  const actualHashes = {
    source_json: sha256(paths.source),
    transcript_json: sha256(paths.transcript),
    edit_plan_json: sha256(paths.editPlan)
  };
  for (const key of Object.keys(actualHashes) as Array<keyof typeof actualHashes>) {
    if (actualHashes[key] !== expectedHashes[key]) {
      fail(`Input artifact changed after P5 planning: ${key}`);
    }
  }

  const streams = streamCounts(paths.video);
  if (streams.video < 1 || streams.audio < 1) {
    fail("rough-cut.mp4 must contain video and audio streams");
  }
  const actualDuration = ffprobeDuration(paths.video);
  if (Math.abs(actualDuration - plan.output_duration_seconds) > 0.25) {
    fail(
      `rough-cut.mp4 duration ${actualDuration.toFixed(3)}s differs from plan ` +
        `${plan.output_duration_seconds.toFixed(3)}s`
    );
  }

  console.log("P5 rough-cut verification: PASS");
  console.log(`Project: ${args.project}`);
  console.log(`Final cuts: ${plan.final_cuts.length}`);
  console.log(`Kept ranges: ${plan.kept_ranges.length}`);
  console.log(`Source duration: ${plan.source_duration_seconds.toFixed(2)}s`);
  console.log(`Output duration: ${plan.output_duration_seconds.toFixed(2)}s`);
  console.log(`Rendered duration: ${actualDuration.toFixed(2)}s`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
