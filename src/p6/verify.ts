import { existsSync, readFileSync, statSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildPlanFromProject, readJson, validateP6Config } from "./plan.ts";
import { isRtlLanguage, parseFps } from "./timeline.ts";
import type { P6Config, P6ProfileName, PresentationPlan } from "./types.ts";

type Args = {
  project: string;
  profile: P6ProfileName;
};

type MediaProbe = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  videoStreams: number;
  audioStreams: number;
};

type P6Meta = {
  schema_version: number;
  project_id: string;
  profile: P6ProfileName;
  style_id: string;
  created_at: string;
  engine: {
    remotion: string;
    remotion_cli: string;
    remotion_captions: string;
    remotion_captions_kit: string;
    browser: string;
    ffmpeg: string;
  };
  input_artifacts_sha256: {
    rough_cut_video: string;
    source_json: string;
    transcript_json: string;
    rough_cut_plan_json: string;
    timeline_map_json: string;
    p6_config_json: string;
    caption_corrections_json?: string;
  };
  presentation_plan_sha256: string;
  render: {
    seconds: number;
    concurrency: number;
    width: number;
    height: number;
    fps: number;
    duration_seconds: number;
    video_codec: string;
    audio_codec: string;
    crf: number;
    audio_bitrate: string;
    pixel_format: string;
  };
  metrics: PresentationPlan["metrics"];
  output: {
    file: string;
    size_bytes: number;
    sha256: string;
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
};

const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const EPS = 1e-6;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Args {
  const project = argv[0] || "";
  const profile = (argv[1] || "source") as P6ProfileName;
  if (!PROJECT_RE.test(project)) {
    fail("Usage: node src/p6/verify.ts <project-id> [source|reel|youtube]");
  }
  if (!("source reel youtube".split(" ") as string[]).includes(profile)) {
    fail(`Unsupported P6 profile: ${profile}`);
  }
  if (argv.length > 2) {
    fail("Too many arguments");
  }
  return { project, profile };
}

function requireFile(path: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`Required P6 artifact is missing: ${path}`);
  }
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(
      `${command} failed (${result.status}): ` +
        `${(result.stderr || result.stdout || "no output").trim()}`
    );
  }
  return (result.stdout || "").trim();
}

function sha256(path: string): string {
  const digest = run("sha256sum", [path]).split(/\s+/)[0];
  if (!SHA256_RE.test(digest)) {
    fail(`Invalid sha256sum output for ${path}`);
  }
  return digest;
}

function validateSchema(planPath: string): void {
  run("ajv", [
    "validate",
    "--spec=draft2020",
    "-s",
    resolve("schemas", "p6-presentation-plan.schema.json"),
    "-d",
    planPath
  ]);
}

function probeMedia(path: string): MediaProbe {
  const raw = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate",
    "-of",
    "json",
    path
  ]);
  const parsed = JSON.parse(raw) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
    }>;
  };
  const streams = parsed.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  return {
    duration: Number(parsed.format?.duration || 0),
    width: Number(video?.width || 0),
    height: Number(video?.height || 0),
    fps: parseFps(video?.avg_frame_rate || "0/1"),
    videoCodec: String(video?.codec_name || ""),
    audioCodec: String(audio?.codec_name || ""),
    videoStreams: streams.filter((stream) => stream.codec_type === "video").length,
    audioStreams: streams.filter((stream) => stream.codec_type === "audio").length
  };
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    fail(`${label} mismatch: got ${String(actual)}, expected ${String(expected)}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, label: string): void {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    fail(
      `${label} mismatch: got ${actual.toFixed(6)}, expected ${expected.toFixed(6)} ` +
        `(tolerance ${tolerance})`
    );
  }
}

function validatePlanSemantics(plan: PresentationPlan): void {
  if (plan.canvas.width % 2 !== 0 || plan.canvas.height % 2 !== 0) {
    fail("P6 canvas dimensions must be even");
  }
  const expectedFrames = Math.max(1, Math.ceil(plan.output_duration_seconds * plan.canvas.fps));
  assertEqual(plan.canvas.duration_in_frames, expectedFrames, "canvas duration_in_frames");
  assertEqual(
    plan.captions.direction,
    isRtlLanguage(plan.captions.language) ? "rtl" : "ltr",
    "caption direction"
  );

  let previousWordStart = -Infinity;
  const displayWordIndexes = new Set<number>();
  for (const [index, word] of plan.captions.words.entries()) {
    if (!(word.source_start < word.source_end) || !(word.output_start < word.output_end)) {
      fail(`captions.words[${index}] has an invalid range`);
    }
    if (word.source_start < -EPS || word.source_end > plan.source_duration_seconds + 1e-4) {
      fail(`captions.words[${index}] exceeds source duration`);
    }
    if (word.output_start < -EPS || word.output_end > plan.output_duration_seconds + 1e-4) {
      fail(`captions.words[${index}] exceeds output duration`);
    }
    if (word.output_start < previousWordStart - 1e-4) {
      fail(`captions.words[${index}] is out of output-time order`);
    }
    if (word.probability < 0 || word.probability > 1) {
      fail(`captions.words[${index}] has invalid probability`);
    }
    if (word.retained_fraction <= 0 || word.retained_fraction > 1) {
      fail(`captions.words[${index}] has invalid retained_fraction`);
    }
    if (word.trimmed_by_cut !== (word.retained_fraction < 0.999)) {
      fail(`captions.words[${index}] trimmed_by_cut is inconsistent`);
    }
    if (!Number.isInteger(word.display_word_index) || word.display_word_index < 0) {
      fail(`captions.words[${index}] has invalid display_word_index`);
    }
    if (displayWordIndexes.has(word.display_word_index)) {
      fail(`captions.words[${index}] duplicates display_word_index`);
    }
    displayWordIndexes.add(word.display_word_index);
    if (
      !Number.isInteger(word.source_word_start) ||
      !Number.isInteger(word.source_word_end) ||
      word.source_word_start < 0 ||
      word.source_word_end < word.source_word_start ||
      word.source_word_end >= plan.metrics.source_words
    ) {
      fail(`captions.words[${index}] has invalid raw source provenance`);
    }
    assertEqual(word.source_word_index, word.source_word_start, `captions.words[${index}].source_word_index`);
    if (word.display_word_index >= plan.metrics.aligned_words) {
      fail(`captions.words[${index}] display_word_index exceeds aligned word count`);
    }
    if (!word.raw_text.trim() || !word.display_text.trim() || word.text !== word.display_text) {
      fail(`captions.words[${index}] has inconsistent raw/display text`);
    }
    previousWordStart = word.output_start;
  }

  const renderedIds = new Set<string>();
  const validateIntent = (
    intent: PresentationPlan["visual_intents"][number],
    index: number,
    deferred: boolean
  ): void => {
    if (!(intent.source_start < intent.source_end) || !(intent.output_start < intent.output_end)) {
      fail(`${deferred ? "deferred" : "rendered"} visual intent ${index} has invalid range`);
    }
    if (intent.output_start < -EPS || intent.output_end > plan.output_duration_seconds + 1e-4) {
      fail(`${deferred ? "deferred" : "rendered"} visual intent ${index} exceeds output duration`);
    }
    if (deferred !== (intent.type === "explainer")) {
      fail(`${deferred ? "deferred" : "rendered"} visual intent ${index} has wrong type`);
    }
    if (intent.source_part < 1 || intent.source_part > intent.source_parts) {
      fail(`${deferred ? "deferred" : "rendered"} visual intent ${index} has invalid part data`);
    }
    if (intent.display_text !== undefined) {
      if ((intent.type !== "title" && intent.type !== "callout") || !intent.display_text.trim()) {
        fail(`${deferred ? "deferred" : "rendered"} visual intent ${index} has invalid display_text`);
      }
    }
    if (renderedIds.has(intent.id)) {
      fail(`Duplicate visual intent id: ${intent.id}`);
    }
    renderedIds.add(intent.id);
  };
  plan.visual_intents.forEach((intent, index) => validateIntent(intent, index, false));
  plan.deferred_visual_intents.forEach((intent, index) => validateIntent(intent, index, true));

  assertEqual(plan.metrics.caption_words, plan.captions.words.length, "metrics.caption_words");
  assertEqual(
    plan.metrics.aligned_words,
    plan.metrics.caption_words + plan.metrics.dropped_words,
    "aligned/caption/dropped word metrics"
  );
  if (plan.metrics.source_words < 0 || plan.metrics.aligned_words < 0) {
    fail("word metrics cannot be negative");
  }
  if (plan.metrics.trimmed_words > plan.metrics.caption_words) {
    fail("metrics.trimmed_words exceeds caption_words");
  }
  assertEqual(
    plan.metrics.rendered_visual_intents,
    plan.visual_intents.length,
    "metrics.rendered_visual_intents"
  );
  assertEqual(
    plan.metrics.deferred_visual_intents,
    plan.deferred_visual_intents.length,
    "metrics.deferred_visual_intents"
  );
  assertEqual(
    plan.metrics.source_visual_intents,
    plan.metrics.rendered_visual_intents +
      plan.metrics.deferred_visual_intents +
      plan.metrics.dropped_visual_intents,
    "visual intent metrics"
  );
  if (plan.metrics.split_visual_intent_fragments < 0) {
    fail("metrics.split_visual_intent_fragments is invalid");
  }
}

function validateExpectedPackages(meta: P6Meta, packagePath: string): void {
  const pkg = readJson<PackageJson>(packagePath);
  const dependencies = pkg.dependencies || {};
  const expected = {
    remotion: dependencies.remotion,
    remotion_cli: dependencies["@remotion/cli"],
    remotion_captions: dependencies["@remotion/captions"],
    remotion_captions_kit: dependencies["remotion-captions-kit"]
  };
  for (const [key, version] of Object.entries(expected)) {
    if (!version) {
      fail(`package.json is missing pinned dependency for ${key}`);
    }
    assertEqual(meta.engine[key as keyof typeof meta.engine], version, `engine.${key}`);
  }
  if (!meta.engine.browser || !meta.engine.ffmpeg) {
    fail("P6 metadata is missing browser or FFmpeg version");
  }
}

function validateHashes(meta: P6Meta, paths: Record<string, string>): void {
  const expectedHashes: Record<string, string> = {
    rough_cut_video: sha256(paths.roughCut),
    source_json: sha256(paths.source),
    transcript_json: sha256(paths.transcript),
    rough_cut_plan_json: sha256(paths.roughCutPlan),
    timeline_map_json: sha256(paths.timelineMap),
    p6_config_json: sha256(paths.config),
    ...(paths.captionCorrections && existsSync(paths.captionCorrections)
      ? { caption_corrections_json: sha256(paths.captionCorrections) }
      : {})
  };
  for (const [key, expected] of Object.entries(expectedHashes)) {
    const actual = meta.input_artifacts_sha256[
      key as keyof P6Meta["input_artifacts_sha256"]
    ];
    if (!SHA256_RE.test(actual || "")) {
      fail(`Metadata contains invalid hash: input_artifacts_sha256.${key}`);
    }
    assertEqual(actual, expected, `input_artifacts_sha256.${key}`);
  }
  assertEqual(meta.presentation_plan_sha256, sha256(paths.plan), "presentation_plan_sha256");
  assertEqual(meta.output.sha256, sha256(paths.video), "output.sha256");
  assertEqual(meta.output.size_bytes, statSync(paths.video).size, "output.size_bytes");
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const dataRoot = resolve(process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", args.project);
  const base = `p6-${args.profile}`;
  const paths = {
    source: join(projectDir, "source.json"),
    transcript: join(projectDir, "transcript.json"),
    roughCutPlan: join(projectDir, "rough-cut-plan.json"),
    timelineMap: join(projectDir, "timeline-map.json"),
    roughCut: join(projectDir, "rough-cut.mp4"),
    config: resolve("config", "p6-profiles.json"),
    package: resolve("package.json"),
    plan: join(projectDir, `${base}.plan.json`),
    video: join(projectDir, `${base}.mp4`),
    meta: join(projectDir, `${base}.meta.json`),
    captionCorrections: join(projectDir, "caption-corrections.json")
  };
  const requiredPaths = [
    paths.source,
    paths.transcript,
    paths.roughCutPlan,
    paths.timelineMap,
    paths.roughCut,
    paths.config,
    paths.package,
    paths.plan,
    paths.video,
    paths.meta
  ];
  requiredPaths.forEach(requireFile);

  validateSchema(paths.plan);
  const config = readJson<P6Config>(paths.config);
  validateP6Config(config);
  const plan = readJson<PresentationPlan>(paths.plan);
  const rebuilt = buildPlanFromProject({
    projectId: args.project,
    profileName: args.profile,
    styleId: plan.style_id,
    dataRoot,
    configPath: paths.config
  });
  if (!isDeepStrictEqual(plan, rebuilt)) {
    fail("Saved P6 presentation plan differs from deterministic rebuild");
  }
  validatePlanSemantics(plan);

  const meta = readJson<P6Meta>(paths.meta);
  assertEqual(meta.schema_version, 1, "metadata schema_version");
  assertEqual(meta.project_id, args.project, "metadata project_id");
  assertEqual(meta.profile, args.profile, "metadata profile");
  assertEqual(meta.style_id, plan.style_id, "metadata style_id");
  if (!Number.isFinite(Date.parse(meta.created_at))) {
    fail("metadata created_at is invalid");
  }
  validateExpectedPackages(meta, paths.package);
  validateHashes(meta, paths);
  if (!isDeepStrictEqual(meta.metrics, plan.metrics)) {
    fail("Metadata metrics do not match presentation plan metrics");
  }

  const probe = probeMedia(paths.video);
  if (probe.videoStreams < 1 || probe.audioStreams < 1) {
    fail("P6 output must contain both video and audio");
  }
  assertEqual(probe.width, plan.canvas.width, "render width");
  assertEqual(probe.height, plan.canvas.height, "render height");
  assertEqual(probe.videoCodec, "h264", "render video codec");
  assertEqual(probe.audioCodec, "aac", "render audio codec");
  assertClose(probe.fps, plan.canvas.fps, 0.02, "render fps");
  const expectedDuration = plan.canvas.duration_in_frames / plan.canvas.fps;
  assertClose(probe.duration, expectedDuration, 0.35, "render duration");

  assertEqual(meta.output.file, `${base}.mp4`, "metadata output.file");
  assertEqual(meta.render.width, probe.width, "metadata render.width");
  assertEqual(meta.render.height, probe.height, "metadata render.height");
  assertClose(meta.render.fps, probe.fps, 0.02, "metadata render.fps");
  assertClose(meta.render.duration_seconds, probe.duration, 0.01, "metadata render.duration");
  assertEqual(meta.render.video_codec, probe.videoCodec, "metadata render.video_codec");
  assertEqual(meta.render.audio_codec, probe.audioCodec, "metadata render.audio_codec");
  assertEqual(meta.render.crf, config.render.crf, "metadata render.crf");
  assertEqual(
    meta.render.audio_bitrate,
    config.render.audio_bitrate,
    "metadata render.audio_bitrate"
  );
  assertEqual(
    meta.render.pixel_format,
    config.render.pixel_format,
    "metadata render.pixel_format"
  );
  if (!Number.isFinite(meta.render.seconds) || meta.render.seconds <= 0) {
    fail("metadata render.seconds is invalid");
  }
  if (!Number.isInteger(meta.render.concurrency) || meta.render.concurrency < 1) {
    fail("metadata render.concurrency is invalid");
  }

  console.log("P6 captions and motion verification: PASS");
  console.log(`Project: ${args.project}`);
  console.log(`Profile: ${args.profile}`);
  console.log(`Canvas: ${plan.canvas.width}x${plan.canvas.height} @ ${plan.canvas.fps}fps`);
  console.log(`Raw/aligned/caption words: ${plan.metrics.source_words}/${plan.metrics.aligned_words}/${plan.metrics.caption_words}`);
  console.log(`Rendered visual intents: ${plan.metrics.rendered_visual_intents}`);
  console.log(`Deferred explainers: ${plan.metrics.deferred_visual_intents}`);
  console.log(`Duration: ${probe.duration.toFixed(3)}s`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
