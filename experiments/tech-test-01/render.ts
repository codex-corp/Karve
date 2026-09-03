import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PresentationPlan } from "../../src/p6/types.ts";

function run(command: string, args: string[], options: { cwd?: string; inherit?: boolean } = {}): string {
  const result = execFileSync(command, args, {
    cwd: options.cwd,
    stdio: options.inherit ? "inherit" : ["pipe", "pipe", "pipe"],
    encoding: "utf8"
  });
  return String(result || "").trim();
}

function main(): void {
  const dataRoot = resolve(process.env.KARVE_DATA_ROOT || "/karve-data");
  const projectDir = join(dataRoot, "projects", "tech-test-01");
  const p7Dir = join(projectDir, "p7");
  const stillsDir = join(p7Dir, "stills");
  const planPath = join(projectDir, "p6-source.plan.json");
  const videoOutputPath = join(p7Dir, "p7-visual-source.mp4");

  if (!existsSync(planPath)) {
    throw new Error(`Presentation plan not found: ${planPath}`);
  }
  if (!existsSync(join(projectDir, "rough-cut.mp4"))) {
    throw new Error(`Media not found: ${join(projectDir, "rough-cut.mp4")}`);
  }

  const plan = JSON.parse(readFileSync(planPath, "utf8")) as PresentationPlan;
  const browser = process.env.CHROME_BIN || "/usr/bin/google-chrome-stable";
  const remotion = process.env.REMOTION_BIN || "/workspace/node_modules/.bin/remotion";

  mkdirSync(stillsDir, { recursive: true });

  const fps = plan.canvas.fps;

  // Stills to render for review (Step 4: Design Stills First)
  const stills = [
    {
      id: "still-1-feature-integration",
      time: 16.5,
      frame: Math.round(16.5 * fps),
      desc: "Beat 1: Feature announcement & direct WhatsApp/Telegram integration badges"
    },
    {
      id: "still-2-ecosystem-relationship",
      time: 23.5,
      frame: Math.round(23.5 * fps),
      desc: "Beat 2: Everyday use expanded into broader connected ecosystem"
    },
    {
      id: "still-3-forward-value",
      time: 28.5,
      frame: Math.round(28.5 * fps),
      desc: "Beat 3: Forward-looking value proposition ('أفضل وأفضل')"
    },
    {
      id: "still-4-demo-handoff",
      time: 31.0,
      frame: Math.round(31.0 * fps),
      desc: "Beat 4: Directional handoff cue leading into live demonstration"
    }
  ];

  console.log("================================================================================");
  console.log("==> STEP 4: RENDERING REPRESENTATIVE DESIGN STILLS (P7-C2 STYLE TOKENS)");
  console.log("================================================================================");

  for (const still of stills) {
    const outputPath = join(stillsDir, `${still.id}.png`);
    console.log(`\n--> Rendering ${still.id} at ${still.time}s (frame ${still.frame})...`);
    console.log(`    Description: ${still.desc}`);

    run(
      remotion,
      [
        "still",
        "experiments/tech-test-01/index.ts",
        "TechTest01P6C",
        outputPath,
        "--props",
        planPath,
        "--public-dir",
        projectDir,
        "--frame",
        String(still.frame),
        "--width",
        String(plan.canvas.width),
        "--height",
        String(plan.canvas.height),
        "--browser-executable",
        browser,
        "--gl",
        "angle",
        "--enable-gpu",
        "--overwrite"
      ],
      { cwd: resolve("."), inherit: true }
    );
    console.log(`    Saved: ${outputPath}`);
  }

  console.log("\n================================================================================");
  console.log("==> STEP 5: RENDERING BOUNDED PREVIEW VIDEO");
  console.log("================================================================================");

  const started = process.hrtime.bigint();
  run(
    remotion,
    [
      "render",
      "experiments/tech-test-01/index.ts",
      "TechTest01P6C",
      videoOutputPath,
      "--props",
      planPath,
      "--public-dir",
      projectDir,
      "--width",
      String(plan.canvas.width),
      "--height",
      String(plan.canvas.height),
      "--fps",
      String(plan.canvas.fps),
      "--duration",
      String(plan.canvas.duration_in_frames),
      "--browser-executable",
      browser,
      "--gl",
      "angle",
      "--enable-gpu",
      "--codec",
      "h264",
      "--audio-codec",
      "aac",
      "--crf",
      "18",
      "--audio-bitrate",
      "192k",
      "--pixel-format",
      "yuv420p",
      "--concurrency",
      "2",
      "--overwrite"
    ],
    { cwd: resolve("."), inherit: true }
  );

  const seconds = Number(process.hrtime.bigint() - started) / 1e9;
  console.log(`\nP7-C2 Visual Experiment Render: PASS ✅`);
  console.log(`Render time: ${seconds.toFixed(2)}s`);
  console.log(`Video output: ${videoOutputPath}`);
}

main();
