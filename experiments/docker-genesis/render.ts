import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

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
  const outputDir = join(dataRoot, "experiments", "docker-genesis");
  const stillsDir = join(outputDir, "stills");
  const videoOutputPath = join(outputDir, "docker-genesis.mp4");

  const browser = process.env.CHROME_BIN || "/usr/bin/google-chrome-stable";
  const remotion = process.env.REMOTION_BIN || "/workspace/node_modules/.bin/remotion";

  mkdirSync(stillsDir, { recursive: true });

  const stills = [
    {
      id: "still-1-blueprint",
      time: 2.0,
      frame: 60,
      desc: "State 1: The Blueprint (Dockerfile) - Translucent graphene planes with logic veins"
    },
    {
      id: "still-2-monolith",
      time: 5.66,
      frame: 170,
      desc: "State 2: The Immutable Monolith (Docker Image) - Stratified hexagonal prism"
    },
    {
      id: "still-3-biosphere",
      time: 10.0,
      frame: 300,
      desc: "State 3: The Living Instance (Docker Container) - Radiant plasma core in Faraday cage"
    }
  ];

  console.log("================================================================================");
  console.log("==> RENDERING DOCKER GENESIS STILLS (CANVAS DESIGN SYSTEM)");
  console.log("================================================================================");

  for (const still of stills) {
    const outputPath = join(stillsDir, `${still.id}.png`);
    console.log(`\n--> Rendering ${still.id} at ${still.time}s (frame ${still.frame})...`);
    console.log(`    Description: ${still.desc}`);

    run(
      remotion,
      [
        "still",
        "experiments/docker-genesis/index.ts",
        "DockerGenesis",
        outputPath,
        "--frame",
        String(still.frame),
        "--width",
        "1280",
        "--height",
        "720",
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
  console.log("==> RENDERING DOCKER GENESIS 16:9 VIDEO (360 FRAMES @ 30 FPS)");
  console.log("================================================================================");

  const started = process.hrtime.bigint();
  run(
    remotion,
    [
      "render",
      "experiments/docker-genesis/index.ts",
      "DockerGenesis",
      videoOutputPath,
      "--width",
      "1280",
      "--height",
      "720",
      "--browser-executable",
      browser,
      "--gl",
      "angle",
      "--enable-gpu",
      "--concurrency",
      "2",
      "--overwrite"
    ],
    { cwd: resolve("."), inherit: true }
  );

  const durationSec = Number(process.hrtime.bigint() - started) / 1e9;
  console.log(`\nDocker Genesis Render: PASS ✅`);
  console.log(`Render time: ${durationSec.toFixed(2)}s`);
  console.log(`Video output: ${videoOutputPath}`);
}

main();
