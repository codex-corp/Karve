import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  autoEditorCuts,
  buildTimelineMap,
  complementCuts,
  expandSimpleRanges,
  filterAutoMicroCuts,
  normalizeIntervals,
  round6,
  shrinkIntervals,
  subtractProtection,
  validateCoverage,
  type AutoEditorV1,
  type Interval
} from "./timeline.ts";

type Args = {
  project: string;
  input: string;
  planOnly: boolean;
  force: boolean;
};

type P5Config = {
  schema_version: number;
  auto_editor: {
    version: string;
    audio_threshold: number;
    margin_seconds: number;
    min_silence_seconds: number;
    min_clip_seconds: number;
  };
  merge: {
    semantic_boundary_margin_seconds: number;
    keep_protection_seconds: number;
    adjacent_gap_seconds: number;
    min_auto_cut_seconds: number;
  };
  render: {
    video_codec: string;
    preset: string;
    crf: number;
    pixel_format: string;
    audio_codec: string;
    audio_bitrate: string;
  };
};

type SourceMetadata = {
  schema_version: number;
  project_id: string;
  source: {
    file_name: string;
    size_bytes: number;
    duration_seconds: number;
  };
  video: {
    avg_frame_rate: string;
  };
};

type EditDecision = {
  action: "keep" | "remove";
  start: number;
  end: number;
  reason_code: string;
  reason: string;
  confidence: number;
};

type EditPlan = {
  schema_version: number;
  project_id: string;
  source_duration_seconds: number;
  decisions: EditDecision[];
  visual_intents: unknown[];
};

type ProbeInfo = {
  duration: number;
  videoStreams: number;
  audioStreams: number;
};

const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DURATION_TOLERANCE_SECONDS = 0.15;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { project: "", input: "", planOnly: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    switch (key) {
      case "--project":
        args.project = argv[++index] || "";
        break;
      case "--input":
        args.input = argv[++index] || "";
        break;
      case "--plan-only":
        args.planOnly = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "-h":
      case "--help":
        console.log(
          "Usage: node src/p5/rough-cut.ts --project <id> --input <source-video> [--plan-only] [--force]"
        );
        process.exit(0);
      default:
        fail(`Unknown argument: ${key}`);
    }
  }
  if (!args.project || !PROJECT_RE.test(args.project)) {
    fail("--project must be a valid Karve project id");
  }
  if (!args.input) {
    fail("--input is required");
  }
  return args;
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${String(error)}`);
  }
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8" });
}

function run(command: string, args: string[], options?: { cwd?: string }): string {
  const result = spawnSync(command, args, {
    cwd: options?.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    fail(`${command} failed (${result.status}): ${stderr || stdout || "no output"}`);
  }
  return (result.stdout || "").trim();
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

function probeSource(path: string): ProbeInfo {
  const raw = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type",
    "-of",
    "json",
    path
  ]);
  const parsed = JSON.parse(raw) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string }>;
  };
  const duration = Number(parsed.format?.duration || 0);
  const streams = parsed.streams || [];
  return {
    duration,
    videoStreams: streams.filter((stream) => stream.codec_type === "video").length,
    audioStreams: streams.filter((stream) => stream.codec_type === "audio").length
  };
}

function verifyInput(path: string, source: SourceMetadata): { sha256: string; probe: ProbeInfo } {
  if (!existsSync(path)) {
    fail(`Source video does not exist: ${path}`);
  }
  const stats = statSync(path);
  if (!stats.isFile()) {
    fail(`Source input is not a file: ${path}`);
  }
  if (stats.size !== source.source.size_bytes) {
    fail(
      `Source size mismatch: got ${stats.size}, expected ${source.source.size_bytes}. ` +
        "Pass the same source file used by P2."
    );
  }
  const probe = probeSource(path);
  if (probe.videoStreams < 1 || probe.audioStreams < 1) {
    fail("P5 source must contain at least one video and one audio stream");
  }
  if (!Number.isFinite(probe.duration) || probe.duration <= 0) {
    fail("P5 source duration is invalid");
  }
  if (Math.abs(probe.duration - source.source.duration_seconds) > DURATION_TOLERANCE_SECONDS) {
    fail(
      `Source duration mismatch: got ${probe.duration.toFixed(3)}s, ` +
        `expected ${source.source.duration_seconds.toFixed(3)}s`
    );
  }
  return { sha256: sha256(path), probe };
}

function autoEditorVersion(): string {
  const output = run("auto-editor", ["--version"]);
  return output.split(/\r?\n/)[0] || output;
}

function assertConfiguredVersion(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    fail(`auto-editor version mismatch: got '${actual}', expected ${expected}`);
  }
}

function runAutoEditorAnalysis(
  audioPath: string,
  outputPath: string,
  config: P5Config
): AutoEditorV1 {
  const threshold = String(config.auto_editor.audio_threshold);
  const margin = `${config.auto_editor.margin_seconds}s`;
  const smooth = `${config.auto_editor.min_silence_seconds}s,${config.auto_editor.min_clip_seconds}s`;
  run("auto-editor", [
    audioPath,
    "--edit",
    `audio:threshold=${threshold}`,
    "--margin",
    margin,
    "--smooth",
    smooth,
    "--export",
    "v1",
    "-o",
    outputPath
  ]);
  return readJson<AutoEditorV1>(outputPath);
}

function semanticIntervals(editPlan: EditPlan): Interval[] {
  return editPlan.decisions
    .filter((item) => item.action === "remove")
    .map((item) => ({
      start: item.start,
      end: item.end,
      sources: ["semantic"] as const,
      reason_codes: [item.reason_code]
    }));
}

function keepRanges(editPlan: EditPlan): Array<{ start: number; end: number }> {
  return editPlan.decisions
    .filter((item) => item.action === "keep")
    .map((item) => ({ start: item.start, end: item.end }));
}

function buildFfmpegFilter(kept: Array<{ start: number; end: number }>): string {
  if (kept.length === 0) {
    fail("P5 would cut the entire source; refusing to render");
  }
  const lines: string[] = [];
  kept.forEach((range, index) => {
    const start = range.start.toFixed(6);
    const end = range.end.toFixed(6);
    lines.push(`[0:v:0]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}]`);
    lines.push(`[0:a:0]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`);
  });
  if (kept.length === 1) {
    lines[0] = lines[0].replace(`[v0]`, "[outv]");
    lines[1] = lines[1].replace(`[a0]`, "[outa]");
  } else {
    const inputs = kept.map((_, index) => `[v${index}][a${index}]`).join("");
    lines.push(`${inputs}concat=n=${kept.length}:v=1:a=1[outv][outa]`);
  }
  return `${lines.join(";\n")}\n`;
}

function renderRoughCut(
  input: string,
  output: string,
  filterPath: string,
  kept: Array<{ start: number; end: number }>,
  config: P5Config
): number {
  writeFileSync(filterPath, buildFfmpegFilter(kept), "utf8");
  const started = process.hrtime.bigint();
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    "-filter_complex_script",
    filterPath,
    "-map",
    "[outv]",
    "-map",
    "[outa]",
    "-c:v",
    config.render.video_codec,
    "-preset",
    config.render.preset,
    "-crf",
    String(config.render.crf),
    "-pix_fmt",
    config.render.pixel_format,
    "-c:a",
    config.render.audio_codec,
    "-b:a",
    config.render.audio_bitrate,
    "-movflags",
    "+faststart",
    output
  ]);
  const elapsed = Number(process.hrtime.bigint() - started) / 1e9;
  return round6(elapsed);
}

function removeIfExists(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

function commitArtifact(tempPath: string, finalPath: string, force: boolean): void {
  if (existsSync(finalPath)) {
    if (!force) {
      fail(`P5 artifact already exists: ${finalPath} (use --force to replace it)`);
    }
    removeIfExists(finalPath);
  }
  renameSync(tempPath, finalPath);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const dataRoot = resolve(process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", args.project);
  const sourceJsonPath = join(projectDir, "source.json");
  const transcriptPath = join(projectDir, "transcript.json");
  const editPlanPath = join(projectDir, "edit-plan.json");
  const audioPath = join(projectDir, "audio.wav");
  const configPath = resolve("config", "p5-defaults.json");

  for (const required of [sourceJsonPath, transcriptPath, editPlanPath, audioPath, configPath]) {
    if (!existsSync(required)) {
      fail(`Required P5 input is missing: ${required}`);
    }
  }

  const source = readJson<SourceMetadata>(sourceJsonPath);
  const editPlan = readJson<EditPlan>(editPlanPath);
  const config = readJson<P5Config>(configPath);
  if (source.schema_version !== 1 || editPlan.schema_version !== 1 || config.schema_version !== 1) {
    fail("P5 currently supports schema_version 1 inputs/config only");
  }
  if (source.project_id !== args.project || editPlan.project_id !== args.project) {
    fail("Project id mismatch across P5 inputs");
  }
  const duration = Number(source.source.duration_seconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    fail("source.json has invalid duration_seconds");
  }
  if (Math.abs(editPlan.source_duration_seconds - duration) > 1e-3) {
    fail("edit-plan source duration does not match source.json");
  }

  const input = resolve(args.input);
  const verifiedSource = verifyInput(input, source);
  const aeVersion = autoEditorVersion();
  assertConfiguredVersion(aeVersion, config.auto_editor.version);

  const finalArtifacts = {
    autoTimeline: join(projectDir, "auto-editor-silence.v1"),
    plan: join(projectDir, "rough-cut-plan.json"),
    map: join(projectDir, "timeline-map.json"),
    meta: join(projectDir, "rough-cut.meta.json"),
    video: join(projectDir, "rough-cut.mp4")
  };
  const outputsToCheck = args.planOnly
    ? [finalArtifacts.autoTimeline, finalArtifacts.plan, finalArtifacts.map, finalArtifacts.meta]
    : Object.values(finalArtifacts);
  if (!args.force) {
    for (const path of outputsToCheck) {
      if (existsSync(path)) {
        fail(`P5 artifact already exists: ${path} (use --force to replace it)`);
      }
    }
  }

  const tempDir = mkdtempSync(join(projectDir, ".p5-tmp-"));
  try {
    const tempAuto = join(tempDir, "auto-editor-silence.v1");
    const autoV1 = runAutoEditorAnalysis(audioPath, tempAuto, config);
    let autoCuts = autoEditorCuts(autoV1, duration);

    const semanticRaw = semanticIntervals(editPlan);
    const semanticCuts = shrinkIntervals(
      semanticRaw,
      config.merge.semantic_boundary_margin_seconds,
      duration,
      config.merge.adjacent_gap_seconds
    );

    const protectedKeep = expandSimpleRanges(
      keepRanges(editPlan),
      config.merge.keep_protection_seconds,
      duration
    );
    autoCuts = subtractProtection(autoCuts, protectedKeep, duration);
    autoCuts = filterAutoMicroCuts(autoCuts, config.merge.min_auto_cut_seconds);

    let finalCuts = normalizeIntervals(
      [...semanticCuts, ...autoCuts],
      duration,
      config.merge.adjacent_gap_seconds
    );
    finalCuts = filterAutoMicroCuts(finalCuts, config.merge.min_auto_cut_seconds);

    const kept = complementCuts(finalCuts, duration);
    validateCoverage(finalCuts, kept, duration);
    const timelineMap = buildTimelineMap(kept);
    if (timelineMap.outputDuration <= 0) {
      fail("P5 output duration would be zero");
    }

    const rawAutoCuts = autoEditorCuts(autoV1, duration);
    const roughCutPlan = {
      schema_version: 1,
      project_id: args.project,
      source_duration_seconds: round6(duration),
      output_duration_seconds: timelineMap.outputDuration,
      settings: config,
      proposals: {
        semantic_remove: semanticRaw.map((item) => ({
          start: round6(item.start),
          end: round6(item.end),
          reason_codes: item.reason_codes || []
        })),
        auto_editor_silence_raw: rawAutoCuts.map((item) => ({
          start: item.start,
          end: item.end
        })),
        auto_editor_silence_after_keep_protection: autoCuts.map((item) => ({
          start: item.start,
          end: item.end
        }))
      },
      final_cuts: finalCuts.map((item) => ({
        start: item.start,
        end: item.end,
        duration: round6(item.end - item.start),
        sources: item.sources,
        reason_codes: item.reason_codes || []
      })),
      kept_ranges: kept.map((item) => ({
        start: item.start,
        end: item.end,
        duration: round6(item.end - item.start)
      })),
      carried_visual_intents: editPlan.visual_intents
    };

    const mapArtifact = {
      schema_version: 1,
      project_id: args.project,
      source_duration_seconds: round6(duration),
      output_duration_seconds: timelineMap.outputDuration,
      segments: timelineMap.segments
    };

    const tempPlan = join(tempDir, "rough-cut-plan.json");
    const tempMap = join(tempDir, "timeline-map.json");
    const tempMeta = join(tempDir, "rough-cut.meta.json");
    const tempVideo = join(tempDir, "rough-cut.mp4");
    const filterPath = join(tempDir, "rough-cut-filter.txt");
    writeJson(tempPlan, roughCutPlan);
    writeJson(tempMap, mapArtifact);

    let renderSeconds: number | null = null;
    let outputProbe: ProbeInfo | null = null;
    if (!args.planOnly) {
      renderSeconds = renderRoughCut(input, tempVideo, filterPath, kept, config);
      outputProbe = probeSource(tempVideo);
      if (outputProbe.videoStreams < 1 || outputProbe.audioStreams < 1) {
        fail("Rendered rough-cut.mp4 is missing video or audio");
      }
      if (Math.abs(outputProbe.duration - timelineMap.outputDuration) > 0.25) {
        fail(
          `Rendered duration ${outputProbe.duration.toFixed(3)}s differs from planned ` +
            `${timelineMap.outputDuration.toFixed(3)}s by more than 0.25s`
        );
      }
    }

    const metaArtifact = {
      schema_version: 1,
      project_id: args.project,
      engine: {
        auto_editor: aeVersion,
        ffmpeg: run("ffmpeg", ["-version"]).split(/\r?\n/)[0]
      },
      source: {
        supplied_file_name: basename(input),
        expected_file_name: source.source.file_name,
        size_bytes: statSync(input).size,
        duration_seconds: round6(verifiedSource.probe.duration),
        sha256: verifiedSource.sha256
      },
      input_artifacts_sha256: {
        source_json: sha256(sourceJsonPath),
        transcript_json: sha256(transcriptPath),
        edit_plan_json: sha256(editPlanPath)
      },
      settings: config,
      counts: {
        semantic_remove_proposals: semanticRaw.length,
        auto_editor_raw_silence_proposals: rawAutoCuts.length,
        auto_editor_after_keep_protection: autoCuts.length,
        final_cuts: finalCuts.length,
        kept_ranges: kept.length
      },
      planned_output_duration_seconds: timelineMap.outputDuration,
      rendered: !args.planOnly,
      render_seconds: renderSeconds,
      rendered_duration_seconds: outputProbe ? round6(outputProbe.duration) : null
    };
    writeJson(tempMeta, metaArtifact);

    commitArtifact(tempAuto, finalArtifacts.autoTimeline, args.force);
    commitArtifact(tempPlan, finalArtifacts.plan, args.force);
    commitArtifact(tempMap, finalArtifacts.map, args.force);
    commitArtifact(tempMeta, finalArtifacts.meta, args.force);
    if (!args.planOnly) {
      commitArtifact(tempVideo, finalArtifacts.video, args.force);
    }

    console.log("");
    console.log(args.planOnly ? "P5 rough-cut planning: PASS" : "P5 rough cut: PASS");
    console.log(`Project: ${args.project}`);
    console.log(`Source duration: ${duration.toFixed(2)}s`);
    console.log(`Planned output: ${timelineMap.outputDuration.toFixed(2)}s`);
    console.log(`Semantic removals: ${semanticRaw.length}`);
    console.log(`Auto-editor silence proposals: ${rawAutoCuts.length}`);
    console.log(`Final cuts: ${finalCuts.length}`);
    if (!args.planOnly && renderSeconds !== null) {
      console.log(`Render time: ${renderSeconds.toFixed(2)}s`);
      console.log(`Output: ${finalArtifacts.video}`);
    } else {
      console.log(`Plan: ${finalArtifacts.plan}`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
