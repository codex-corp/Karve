import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

function run(command: string, args: string[]): string {
  const result = execFileSync(command, args, {
    cwd: resolve("."),
    stdio: "inherit",
    encoding: "utf8"
  });
  return String(result || "").trim();
}

function main(): void {
  const outputDir = resolve("experiments/zkrollup-foundation-frame/output");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, "zkrollup-motion-choreography-frame.png");
  const browser = process.env.CHROME_BIN || "/usr/bin/google-chrome-stable";
  const remotion = process.env.REMOTION_BIN || "./node_modules/.bin/remotion";

  console.log("==> RENDERING MOTION-DESIGN CHOREOGRAPHED FRAME (FRAME 140)");
  console.log(`Output: ${outputPath}`);

  run(remotion, [
    "still",
    "experiments/zkrollup-foundation-frame/index.ts",
    "ZKRollupStill",
    outputPath,
    "--frame",
    "140",
    "--width",
    "1920",
    "--height",
    "1080",
    "--browser-executable",
    browser,
    "--gl",
    "angle",
    "--enable-gpu",
    "--overwrite"
  ]);

  console.log(`\nFrame rendered successfully: ${outputPath}`);
}

main();
