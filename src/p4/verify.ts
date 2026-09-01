import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateEditPlan } from "./validate.ts";

type SourceMetadata = {
  project_id: string;
  source: { duration_seconds: number };
};

type Transcript = {
  project_id: string;
  segments: Array<{ id: number }>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function projectArg(argv: string[]): string {
  const index = argv.indexOf("--project");
  if (index < 0 || !argv[index + 1]) {
    throw new Error("Usage: node src/p4/verify.ts --project <id>");
  }
  const project = argv[index + 1];
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(project)) {
    throw new Error("Invalid project id");
  }
  return project;
}

function main(): void {
  const project = projectArg(process.argv.slice(2));
  const dataRoot = process.env.KARVE_DATA_ROOT || "/karve-data";
  const projectDir = resolve(dataRoot, "projects", project);
  const source = readJson<SourceMetadata>(resolve(projectDir, "source.json"));
  const transcript = readJson<Transcript>(resolve(projectDir, "transcript.json"));
  const plan = readJson<Record<string, unknown>>(resolve(projectDir, "edit-plan.json"));
  const schemaPath = resolve("schemas", "edit-plan.schema.json");

  const validation = validateEditPlan(plan, schemaPath, {
    projectId: project,
    sourceDurationSeconds: source.source.duration_seconds,
    transcriptSegmentIds: new Set(transcript.segments.map((segment) => Number(segment.id)))
  });

  if (!validation.ok) {
    throw new Error(`P4 edit-plan verification failed:\n${validation.errors.join("\n")}`);
  }

  const decisions = plan.decisions as Array<{ action: string }>;
  const removeCount = decisions.filter((item) => item.action === "remove").length;
  const keepCount = decisions.filter((item) => item.action === "keep").length;
  const visualCount = Array.isArray(plan.visual_intents) ? plan.visual_intents.length : 0;

  console.log("P4 edit-plan verification: PASS");
  console.log(`Project: ${project}`);
  console.log(`Keep decisions: ${keepCount}`);
  console.log(`Remove decisions: ${removeCount}`);
  console.log(`Visual intents: ${visualCount}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
