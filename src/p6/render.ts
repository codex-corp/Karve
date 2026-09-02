import {
  existsSync,
  mkdtempSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildPlanFromProject, readJson, validateP6Config } from "./plan.ts";
import { parseFps, round6 } from "./timeline.ts";
import type { P6Config, P6ProfileName, PresentationPlan } from "./types.ts";

type Args = {
  project: string;
  profile: P6ProfileName;
  style?: string;
  planOnly: boolean;
  force: boolean;
  concurrency?: number;
};

type MediaProbe = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoStreams: number;
  audioStreams: number;
  videoCodec: string;
  audioCodec: string;
};

const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    project: "",
    profile: "source",
    planOnly: false,
    force: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    switch (key) {
      case "--project":
        args.project = argv[++index] || "";
        break;
      case "--profile":
        args.profile = (argv[++index] || "") as P6ProfileName;
        break;
      case "--style":
        args.style = argv[++index] || "";
        break;
      case "--plan-only":
        args.planOnly = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "--concurrency":
        args.concurrency = Number(argv[++index]);
        break;
      case "-h":
      case "--help":
        console.log(
          "Usage: node src/p6/render.ts --project <id> [--profile source|reel|youtube] " +
            "[--style <id>] [--plan-only] [--concurrency <n>] [--force]"
        );
        process.exit(0);
      default:
        fail(`Unknown argument: ${key}`);
    }
  }
  if (!args.project || !PROJECT_RE.test(args.project)) {
    fail("--project must be a valid Karve project id");
  }
  if (!("source reel youtube".split(" ") as string[]).includes(args.profile)) {
    fail(`Unsupported P6 profile: ${args.profile}`);
  }
  if (args.style !== undefined && !args.style) {
    fail("--style requires a non-empty id");
  }
  if (
    args.concurrency !== undefined &&
    (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 32)
  ) {
    fail("--concurrency must be an integer between 1 and 32");
  }
  return args;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(
  command: string,
  args: string[],
  options?: { cwd?: string; inherit?: boolean }
): string {
  const result = spawnSync(command, args, {
    cwd: options?.cwd,
    encoding: "utf8",
    stdio: options?.inherit ? "inherit" : ["ignore", "pipe", "pipe"]
  });
  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
    fail(`${command} failed (${result.status}): ${stderr || stdout || "no output"}`);
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : "";
}

function sha256(path: string): string {
  const digest = run("sha256sum", [path]).split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    fail(`Invalid sha256sum output for ${path}`);
  }
  return digest;
}

function packageVersion(name: string): string {
  const packagePath = resolve("/workspace/node_modules", name, "package.json");
  requireFile(packagePath);
  const pkg = readJson<{ version?: string }>(packagePath);
  if (!pkg.version) {
    fail(`Package version is missing: ${name}`);
  }
  return pkg.version;
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
    videoStreams: streams.filter((stream) => stream.codec_type === "video").length,
    audioStreams: streams.filter((stream) => stream.codec_type === "audio").length,
    videoCodec: String(video?.codec_name || ""),
    audioCodec: String(audio?.codec_name || "")
  };
}

function removeIfExists(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

function commitArtifact(tempPath: string, finalPath: string, force: boolean): void {
  if (existsSync(finalPath)) {
    if (!force) {
      fail(`P6 artifact already exists: ${finalPath} (use --force to replace it)`);
    }
    removeIfExists(finalPath);
  }
  renameSync(tempPath, finalPath);
}

function requireFile(path: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`Required P6 input is missing: ${path}`);
  }
}

function browserExecutable(): string {
  const browser = process.env.CHROME_BIN || "/usr/bin/google-chrome-stable";
  requireFile(browser);
  return browser;
}

function remotionExecutable(): string {
  const executable = process.env.REMOTION_BIN || "/workspace/node_modules/.bin/remotion";
  requireFile(executable);
  return executable;
}

function renderWithRemotion(options: {
  plan: PresentationPlan;
  planPath: string;
  outputPath: string;
  projectDir: string;
  config: P6Config;
  concurrency: number;
  browser: string;
  remotion: string;
}): number {
  const started = process.hrtime.bigint();
  run(
    options.remotion,
    [
      "render",
      "remotion/index.ts",
      "KarveP6",
      options.outputPath,
      "--props",
      options.planPath,
      "--public-dir",
      options.projectDir,
      "--width",
      String(options.plan.canvas.width),
      "--height",
      String(options.plan.canvas.height),
      "--fps",
      String(options.plan.canvas.fps),
      "--duration",
      String(options.plan.canvas.duration_in_frames),
      "--browser-executable",
      options.browser,
      "--gl",
      "angle",
      "--enable-gpu",
      "--codec",
      options.config.render.codec,
      "--audio-codec",
      options.config.render.audio_codec,
      "--crf",
      String(options.config.render.crf),
      "--audio-bitrate",
      options.config.render.audio_bitrate,
      "--pixel-format",
      options.config.render.pixel_format,
      "--concurrency",
      String(options.concurrency),
      "--overwrite"
    ],
    { cwd: resolve("."), inherit: true }
  );
  return round6(Number(process.hrtime.bigint() - started) / 1e9);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const dataRoot = resolve(process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", args.project);
  const configPath = resolve("config", "p6-profiles.json");

  const requiredInputs = [
    "source.json",
    "transcript.json",
    "rough-cut-plan.json",
    "timeline-map.json",
    "rough-cut.mp4"
  ].map((name) => join(projectDir, name));
  requiredInputs.forEach(requireFile);
  requireFile(configPath);

  const config = readJson<P6Config>(configPath);
  validateP6Config(config);
  const plan = buildPlanFromProject({
    projectId: args.project,
    profileName: args.profile,
    styleId: args.style,
    dataRoot,
    configPath
  });

  const base = `p6-${args.profile}`;
  const finalPlan = join(projectDir, `${base}.plan.json`);
  const finalVideo = join(projectDir, `${base}.mp4`);
  const finalMeta = join(projectDir, `${base}.meta.json`);
  const outputsToCheck = args.planOnly ? [finalPlan] : [finalPlan, finalVideo, finalMeta];
  if (!args.force) {
    for (const output of outputsToCheck) {
      if (existsSync(output)) {
        fail(`P6 artifact already exists: ${output} (use --force to replace it)`);
      }
    }
  }

  const tempDir = mkdtempSync(join(projectDir, ".p6-tmp-"));
  try {
    const tempPlan = join(tempDir, `${base}.plan.json`);
    writeJson(tempPlan, plan);

    if (args.planOnly) {
      commitArtifact(tempPlan, finalPlan, args.force);
      console.log("\nP6 presentation planning: PASS");
      console.log(`Project: ${args.project}`);
      console.log(`Profile: ${args.profile}`);
      console.log(`Caption words: ${plan.metrics.caption_words}`);
      console.log(`Visual intents: ${plan.metrics.rendered_visual_intents}`);
      console.log(`Deferred explainers: ${plan.metrics.deferred_visual_intents}`);
      console.log(`Plan: ${finalPlan}`);
      return;
    }

    const browser = browserExecutable();
    const remotion = remotionExecutable();
    const tempVideo = join(tempDir, `${base}.mp4`);
    const concurrency = args.concurrency || config.render.concurrency;
    const renderSeconds = renderWithRemotion({
      plan,
      planPath: tempPlan,
      outputPath: tempVideo,
      projectDir,
      config,
      concurrency,
      browser,
      remotion
    });
    const outputProbe = probeMedia(tempVideo);
    if (outputProbe.videoStreams < 1 || outputProbe.audioStreams < 1) {
      fail("P6 render is missing video or audio");
    }
    if (outputProbe.width !== plan.canvas.width || outputProbe.height !== plan.canvas.height) {
      fail(
        `P6 render size is ${outputProbe.width}x${outputProbe.height}; expected ` +
          `${plan.canvas.width}x${plan.canvas.height}`
      );
    }
    if (outputProbe.videoCodec !== "h264" || outputProbe.audioCodec !== "aac") {
      fail(
        `P6 codecs are ${outputProbe.videoCodec}/${outputProbe.audioCodec}; expected h264/aac`
      );
    }
    const expectedDuration = plan.canvas.duration_in_frames / plan.canvas.fps;
    if (Math.abs(outputProbe.duration - expectedDuration) > 0.35) {
      fail(
        `P6 render duration ${outputProbe.duration.toFixed(3)}s differs from expected ` +
          `${expectedDuration.toFixed(3)}s by more than 0.35s`
      );
    }

    const tempMeta = join(tempDir, `${base}.meta.json`);
    const meta = {
      schema_version: 1,
      project_id: args.project,
      profile: args.profile,
      style_id: plan.style_id,
      created_at: new Date().toISOString(),
      engine: {
        remotion: packageVersion("remotion"),
        remotion_cli: packageVersion("@remotion/cli"),
        remotion_captions: packageVersion("@remotion/captions"),
        remotion_captions_kit: packageVersion("remotion-captions-kit"),
        browser: run(browser, ["--version"]).split(/\r?\n/)[0],
        ffmpeg: run("ffmpeg", ["-version"]).split(/\r?\n/)[0]
      },
      input_artifacts_sha256: {
        rough_cut_video: sha256(join(projectDir, "rough-cut.mp4")),
        source_json: sha256(join(projectDir, "source.json")),
        transcript_json: sha256(join(projectDir, "transcript.json")),
        rough_cut_plan_json: sha256(join(projectDir, "rough-cut-plan.json")),
        timeline_map_json: sha256(join(projectDir, "timeline-map.json")),
        p6_config_json: sha256(configPath),
        ...(existsSync(join(projectDir, "caption-corrections.json"))
          ? { caption_corrections_json: sha256(join(projectDir, "caption-corrections.json")) }
          : {})
      },
      presentation_plan_sha256: sha256(tempPlan),
      render: {
        seconds: renderSeconds,
        concurrency,
        width: outputProbe.width,
        height: outputProbe.height,
        fps: round6(outputProbe.fps),
        duration_seconds: round6(outputProbe.duration),
        video_codec: outputProbe.videoCodec,
        audio_codec: outputProbe.audioCodec,
        crf: config.render.crf,
        audio_bitrate: config.render.audio_bitrate,
        pixel_format: config.render.pixel_format
      },
      metrics: plan.metrics,
      output: {
        file: `${base}.mp4`,
        size_bytes: statSync(tempVideo).size,
        sha256: sha256(tempVideo)
      }
    };
    writeJson(tempMeta, meta);

    commitArtifact(tempPlan, finalPlan, args.force);
    commitArtifact(tempVideo, finalVideo, args.force);
    commitArtifact(tempMeta, finalMeta, args.force);

    console.log("\nP6 captions and motion render: PASS");
    console.log(`Project: ${args.project}`);
    console.log(`Profile: ${args.profile}`);
    console.log(`Canvas: ${plan.canvas.width}x${plan.canvas.height} @ ${plan.canvas.fps}fps`);
    console.log(`Caption words: ${plan.metrics.caption_words}`);
    console.log(`Visual intents: ${plan.metrics.rendered_visual_intents}`);
    console.log(`Deferred explainers: ${plan.metrics.deferred_visual_intents}`);
    console.log(`Render time: ${renderSeconds.toFixed(2)}s`);
    console.log(`Output: ${finalVideo}`);
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
