import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";
const STILLS_DIR = path.join(EXPERIMENT_DIR, "stills");
fs.mkdirSync(STILLS_DIR, { recursive: true });

function runCommand(cmd: string, args: string[]) {
  console.log(`\n==> Executing: ${cmd} ${args.join(" ")}`);
  const out = execFileSync(cmd, args, {
    cwd: "/home/hany/webserver/server/www/karve",
    encoding: "utf8",
    stdio: "inherit"
  });
  return out;
}

const STILLS = [
  { id: "still-1-opening-problem", frame: 75, desc: "Opening / Unindexed Query" },
  { id: "still-2-full-scan", frame: 225, desc: "Full Table Scan in Progress (O(N))" },
  { id: "still-3-index-intro", frame: 390, desc: "Introduction of Auxiliary B-Tree Index" },
  { id: "still-4-tree-narrowing", frame: 530, desc: "Search Narrowing & Subtree Elimination (O(log N))" },
  { id: "still-5-matched-row", frame: 710, desc: "Direct Pointer Ray to Target Row 77" },
  { id: "still-6-performance-contrast", frame: 800, desc: "O(N) vs O(log N) Performance Contrast" },
  { id: "still-7-final-takeaway", frame: 870, desc: "Trade-offs & Write / Storage Costs" },
];

async function main() {
  const version = process.argv[2] || "v1";
  console.log(`=== RENDERING DB INDEX EXPLAINER (${version}) ===`);

  // 1. Render representative stills
  console.log("\n--- RENDERING REPRESENTATIVE STILLS ---");
  for (const s of STILLS) {
    const outPath = path.join(STILLS_DIR, `${s.id}.png`);
    console.log(`Rendering ${s.id} at frame ${s.frame} (${s.desc})...`);
    runCommand("docker", [
      "compose", "run", "--rm", "karve",
      "/workspace/node_modules/.bin/remotion", "still",
      "experiments/db-index-explainer/index.ts",
      "DbIndexExplainer",
      `experiments/db-index-explainer/stills/${s.id}.png`,
      "--frame", String(s.frame),
      "--width", "1920",
      "--height", "1080",
      "--browser-executable", "/usr/bin/google-chrome-stable",
      "--overwrite"
    ]);
  }

  // 2. Render complete video
  const videoFile = `db-index-explainer-${version}.mp4`;
  const videoPath = path.join(EXPERIMENT_DIR, videoFile);
  console.log(`\n--- RENDERING FULL 30-SECOND VIDEO (${videoFile}) ---`);
  const started = Date.now();
  runCommand("docker", [
    "compose", "run", "--rm", "karve",
    "/workspace/node_modules/.bin/remotion", "render",
    "experiments/db-index-explainer/index.ts",
    "DbIndexExplainer",
    `experiments/db-index-explainer/${videoFile}`,
    "--width", "1920",
    "--height", "1080",
    "--fps", "30",
    "--duration", "900",
    "--browser-executable", "/usr/bin/google-chrome-stable",
    "--codec", "h264",
    "--crf", "18",
    "--pixel-format", "yuv420p",
    "--concurrency", "4",
    "--overwrite"
  ]);
  const durationSec = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nRender completed in ${durationSec}s!`);
  console.log(`Video saved: ${videoPath}`);
}

main().catch(err => {
  console.error("Render failed:", err);
  process.exit(1);
});
