import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";
import {
  mapRangeThroughTimeline,
  round6,
  validateTimelineMap
} from "../p6/timeline.ts";
import type { TimelineMap } from "../p6/types.ts";
import type {
  EvidenceItem,
  P7Profile,
  P7VisualMode,
  VisualMission,
  VisualMissionArtifacts
} from "./types.ts";

export const DEFAULT_FORBIDDEN_PATHS = [
  "src/",
  "remotion/",
  "schemas/",
  "scripts/",
  "config/",
  "docker/",
  ".git/"
];

export const DEFAULT_FORBIDDEN_MUTATIONS = [
  "source.json",
  "transcript.json",
  "rough-cut.mp4",
  "rough-cut-plan.json",
  "timeline-map.json",
  "p6-*.plan.json",
  "caption-corrections.json"
];

export function validateSandboxPath(
  allowedOutputRoot: string,
  forbiddenPaths: string[] = DEFAULT_FORBIDDEN_PATHS,
  repoRoot = process.cwd()
): void {
  const resolvedOutput = resolve(repoRoot, allowedOutputRoot);
  const normalizedOutput = normalize(resolvedOutput);

  // Check normalized path against forbidden paths
  for (const forbidden of forbiddenPaths) {
    const resolvedForbidden = resolve(repoRoot, forbidden);
    const normalizedForbidden = normalize(resolvedForbidden);

    if (
      normalizedOutput === normalizedForbidden ||
      normalizedOutput.startsWith(
        normalizedForbidden.endsWith("/") ? normalizedForbidden : normalizedForbidden + "/"
      )
    ) {
      throw new Error(
        `Sandbox violation: allowed_output_root '${allowedOutputRoot}' resolves inside forbidden path '${forbidden}'`
      );
    }
  }

  // If path exists, check realpath to block symlink traversal escapes
  if (existsSync(normalizedOutput)) {
    const realOutput = realpathSync(normalizedOutput);
    for (const forbidden of forbiddenPaths) {
      const resolvedForbidden = resolve(repoRoot, forbidden);
      const realForbidden = existsSync(resolvedForbidden)
        ? realpathSync(resolvedForbidden)
        : normalize(resolvedForbidden);

      if (
        realOutput === realForbidden ||
        realOutput.startsWith(
          realForbidden.endsWith("/") ? realForbidden : realForbidden + "/"
        )
      ) {
        throw new Error(
          `Sandbox violation: allowed_output_root '${allowedOutputRoot}' realpath points inside forbidden path '${forbidden}'`
        );
      }
    }
  }
}

export function verifyEvidenceIntegrity(items: EvidenceItem[]): void {
  for (const item of items) {
    if (item.path_or_uri) {
      // Ignore web/custom URIs
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(item.path_or_uri)) {
        continue;
      }

      const resolved = resolve(item.path_or_uri);
      if (!existsSync(resolved)) {
        throw new Error(
          `Evidence asset integrity violation: evidence '${item.id}' points to missing file '${item.path_or_uri}'`
        );
      }

      if (item.sha256) {
        const fileData = readFileSync(resolved);
        const actualHash = createHash("sha256").update(new Uint8Array(fileData)).digest("hex");
        if (actualHash.toLowerCase() !== item.sha256.toLowerCase()) {
          throw new Error(
            `Evidence asset integrity violation: evidence '${item.id}' checksum mismatch (expected: ${item.sha256}, actual: ${actualHash})`
          );
        }
      }
    }
  }
}

export function buildVisualMission(params: {
  projectId: string;
  profile: P7Profile;
  mode: P7VisualMode;
  styleProfile?: string;
  sourceRange: { start: number; end: number };
  timelineMap: TimelineMap;
  artifacts: VisualMissionArtifacts;
  evidenceManifest?: EvidenceItem[];
  allowedOutputRoot: string;
  forbiddenPaths?: string[];
  maxDurationSeconds?: number;
  skipEvidenceFileCheck?: boolean;
}): VisualMission {
  validateTimelineMap(params.timelineMap);

  const fragments = mapRangeThroughTimeline(
    params.sourceRange.start,
    params.sourceRange.end,
    params.timelineMap.segments
  );

  if (fragments.length === 0) {
    throw new Error(
      `Source range [${params.sourceRange.start}, ${params.sourceRange.end}] has no retained frames in timeline-map`
    );
  }

  if (fragments.length > 1) {
    throw new Error(
      `Source range [${params.sourceRange.start}, ${params.sourceRange.end}] is split across ${fragments.length} cut segments; P7 visual missions must be contiguous`
    );
  }

  const mapped = fragments[0];
  const duration = round6(mapped.output_end - mapped.output_start);
  const maxDuration = params.maxDurationSeconds ?? 60;

  if (duration > maxDuration) {
    throw new Error(
      `Segment duration (${duration}s) exceeds maximum allowed duration (${maxDuration}s)`
    );
  }

  const forbiddenPaths = params.forbiddenPaths ?? DEFAULT_FORBIDDEN_PATHS;

  // Validate sandbox realpath and traversal boundaries
  validateSandboxPath(params.allowedOutputRoot, forbiddenPaths);

  const manifest = params.evidenceManifest ?? [];
  if (!params.skipEvidenceFileCheck) {
    verifyEvidenceIntegrity(manifest);
  }

  const mission: VisualMission = {
    schema_version: 1,
    project_id: params.projectId,
    profile: params.profile,
    mode: params.mode,
    style_profile: params.styleProfile ?? "karve-technical-v1",
    segment: {
      source_start: mapped.source_start,
      source_end: mapped.source_end,
      output_start: mapped.output_start,
      output_end: mapped.output_end,
      duration_seconds: duration
    },
    artifacts: {
      source_metadata: params.artifacts.source_metadata,
      transcript: params.artifacts.transcript,
      rough_cut_video: params.artifacts.rough_cut_video,
      rough_cut_plan: params.artifacts.rough_cut_plan,
      timeline_map: params.artifacts.timeline_map,
      presentation_plan: params.artifacts.presentation_plan,
      ...(params.artifacts.caption_corrections
        ? { caption_corrections: params.artifacts.caption_corrections }
        : {})
    },
    evidence_manifest: manifest,
    output_sandbox: {
      allowed_output_root: params.allowedOutputRoot,
      forbidden_paths: forbiddenPaths
    },
    scope_rules: {
      max_duration_seconds: maxDuration,
      allow_artifact_mutation: false,
      forbidden_mutations: DEFAULT_FORBIDDEN_MUTATIONS
    }
  };

  return mission;
}

export function validateMissionSchema(
  mission: unknown,
  schemaPath = resolve("schemas", "p7-visual-mission.schema.json")
): string[] {
  const dir = mkdtempSync(join(tmpdir(), "karve-p7-mission-validate-"));
  const tempFile = join(dir, "mission.json");

  try {
    writeFileSync(tempFile, `${JSON.stringify(mission, null, 2)}\n`, "utf8");
    const result = spawnSync(
      "ajv",
      ["validate", "--spec=draft2020", "-s", schemaPath, "-d", tempFile],
      { encoding: "utf8" }
    );

    if (result.error) {
      return [`AJV execution failed: ${result.error.message}`];
    }

    if (result.status !== 0) {
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
      return [output || `AJV exited with status ${String(result.status)}`];
    }

    return [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function validateMission(
  mission: VisualMission,
  timelineMap?: TimelineMap,
  options?: { schemaPath?: string; skipEvidenceFileCheck?: boolean }
): void {
  const schemaErrors = validateMissionSchema(mission, options?.schemaPath);
  if (schemaErrors.length > 0) {
    throw new Error(`Mission schema validation failed:\n${schemaErrors.join("\n")}`);
  }

  // Check unique evidence IDs
  const seenIds = new Set<string>();
  for (const item of mission.evidence_manifest) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate evidence item ID in manifest: '${item.id}'`);
    }
    seenIds.add(item.id);
  }

  // Check sandbox safety with realpath
  validateSandboxPath(
    mission.output_sandbox.allowed_output_root,
    mission.output_sandbox.forbidden_paths
  );

  // Check evidence file integrity if local file
  if (!options?.skipEvidenceFileCheck) {
    verifyEvidenceIntegrity(mission.evidence_manifest);
  }

  // If timeline map is provided, verify segment mapping using P6 timeline primitives
  if (timelineMap) {
    validateTimelineMap(timelineMap);
    const fragments = mapRangeThroughTimeline(
      mission.segment.source_start,
      mission.segment.source_end,
      timelineMap.segments
    );
    if (fragments.length === 0) {
      throw new Error(
        `Mission segment [${mission.segment.source_start}, ${mission.segment.source_end}] has no mapped frames in timeline-map`
      );
    }
    if (fragments.length > 1) {
      throw new Error(
        `Mission segment spans multiple cuts in timeline-map; must be contiguous`
      );
    }
    const expected = fragments[0];
    if (
      Math.abs(expected.output_start - mission.segment.output_start) > 1e-4 ||
      Math.abs(expected.output_end - mission.segment.output_end) > 1e-4
    ) {
      throw new Error(
        `Mission segment output range [${mission.segment.output_start}, ${mission.segment.output_end}] does not match timeline-map expectation [${expected.output_start}, ${expected.output_end}]`
      );
    }
  }
}
