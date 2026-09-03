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
  const outputDir = resolve("experiments/docker-foundation-frame/output");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, "docker-foundation-frame.png");
  const browser = process.env.CHROME_BIN || "/usr/bin/google-chrome-stable";
  const remotion = process.env.REMOTION_BIN || "./node_modules/.bin/remotion";

  console.log("==> RENDERING 1920x1080 STILL FRAME (UI-STYLING METHODOLOGY)");
  console.log(`Output: ${outputPath}`);

  run(remotion, [
    "still",
    "experiments/docker-foundation-frame/index.ts",
    "DockerFoundationStill",
    outputPath,
    "--frame",
    "0",
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
