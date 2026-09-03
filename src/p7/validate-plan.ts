import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  mapRangeThroughTimeline,
  round6,
  validateTimelineMap
} from "../p6/timeline.ts";
import type { TimelineMap } from "../p6/types.ts";
import { discoverCatalog, type VisualCatalog } from "./catalog.ts";
import { getStyleProfile } from "./style-profile.ts";
import type { FactualCategory, VisualMission, VisualPlan } from "./types.ts";

export type PlanValidationOptions = {
  mission?: VisualMission;
  timelineMap?: TimelineMap;
  catalog?: VisualCatalog;
  schemaPath?: string;
};

export const CATEGORY_COMPATIBILITY: Record<FactualCategory, string[]> = {
  brand_asset: ["brand_asset"],
  real_ui: ["real_ui", "screenshot"],
  real_code: ["real_code"],
  api: ["api", "real_code"],
  metrics_data: ["metrics_data"],
  product_capability: ["real_ui", "screenshot", "real_code", "api"],
  quote: ["quote"],
  exact_technical_claim: ["real_code", "api", "metrics_data", "real_ui"]
};

export function isEvidenceCompatible(
  claimCategory: FactualCategory,
  evidenceCategory: string
): boolean {
  const allowed = CATEGORY_COMPATIBILITY[claimCategory];
  if (!allowed) {
    return false;
  }
  return allowed.includes(evidenceCategory);
}

export function validatePlanSchema(
  plan: unknown,
  schemaPath = resolve("schemas", "p7-visual-plan.schema.json")
): string[] {
  const dir = mkdtempSync(join(tmpdir(), "karve-p7-plan-validate-"));
  const tempFile = join(dir, "visual-plan.json");

  try {
    writeFileSync(tempFile, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
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

export function validateVisualPlan(
  plan: VisualPlan,
  options: PlanValidationOptions = {}
): void {
  // 1. JSON Schema validation
  const schemaErrors = validatePlanSchema(plan, options.schemaPath);
  if (schemaErrors.length > 0) {
    throw new Error(`Visual plan schema validation failed:\n${schemaErrors.join("\n")}`);
  }

  // 2. Style profile validation
  if (plan.style_profile) {
    getStyleProfile(plan.style_profile);
  }

  // 3. Segment duration consistency
  const expectedDuration = round6(plan.segment.output_end - plan.segment.output_start);
  if (Math.abs(expectedDuration - plan.segment.duration_seconds) > 1e-4) {
    throw new Error(
      `Plan segment duration_seconds (${plan.segment.duration_seconds}) does not match output_end - output_start (${expectedDuration})`
    );
  }

  // 4. Mission alignment (if mission provided)
  if (options.mission) {
    const mission = options.mission;
    if (plan.project_id !== mission.project_id) {
      throw new Error(
        `Plan project_id '${plan.project_id}' does not match mission '${mission.project_id}'`
      );
    }
    if (plan.profile !== mission.profile) {
      throw new Error(
        `Plan profile '${plan.profile}' does not match mission '${mission.profile}'`
      );
    }
    if (plan.mode !== mission.mode) {
      throw new Error(
        `Plan mode '${plan.mode}' does not match mission '${mission.mode}'`
      );
    }
    if (
      mission.style_profile &&
      plan.style_profile &&
      plan.style_profile !== mission.style_profile
    ) {
      throw new Error(
        `Plan style_profile '${plan.style_profile}' does not match mission style_profile '${mission.style_profile}'`
      );
    }
    if (
      Math.abs(plan.segment.source_start - mission.segment.source_start) > 1e-4 ||
      Math.abs(plan.segment.source_end - mission.segment.source_end) > 1e-4
    ) {
      throw new Error(
        `Plan source segment [${plan.segment.source_start}, ${plan.segment.source_end}] does not match mission [${mission.segment.source_start}, ${mission.segment.source_end}]`
      );
    }
    if (
      Math.abs(plan.segment.output_start - mission.segment.output_start) > 1e-4 ||
      Math.abs(plan.segment.output_end - mission.segment.output_end) > 1e-4
    ) {
      throw new Error(
        `Plan output segment [${plan.segment.output_start}, ${plan.segment.output_end}] does not match mission [${mission.segment.output_start}, ${mission.segment.output_end}]`
      );
    }
  }

  // 5. Timeline mapping check (if timelineMap provided)
  if (options.timelineMap) {
    validateTimelineMap(options.timelineMap);

    // Verify overall segment mapping
    const segFragments = mapRangeThroughTimeline(
      plan.segment.source_start,
      plan.segment.source_end,
      options.timelineMap.segments
    );
    if (segFragments.length !== 1) {
      throw new Error(
        `Plan segment source range [${plan.segment.source_start}, ${plan.segment.source_end}] does not map to a single contiguous cut in timeline-map`
      );
    }
    if (
      Math.abs(segFragments[0].output_start - plan.segment.output_start) > 1e-4 ||
      Math.abs(segFragments[0].output_end - plan.segment.output_end) > 1e-4
    ) {
      throw new Error(
        `Plan output segment [${plan.segment.output_start}, ${plan.segment.output_end}] does not match timeline-map expectation [${segFragments[0].output_start}, ${segFragments[0].output_end}]`
      );
    }

    // Verify each beat through timeline map
    for (const beat of plan.beats) {
      const beatFragments = mapRangeThroughTimeline(
        beat.source_start,
        beat.source_end,
        options.timelineMap.segments
      );
      if (beatFragments.length !== 1) {
        throw new Error(
          `Beat '${beat.id}' source range [${beat.source_start}, ${beat.source_end}] is split or missing in timeline-map`
        );
      }
      if (
        Math.abs(beatFragments[0].output_start - beat.output_start) > 1e-4 ||
        Math.abs(beatFragments[0].output_end - beat.output_end) > 1e-4
      ) {
        throw new Error(
          `Beat '${beat.id}' output range [${beat.output_start}, ${beat.output_end}] does not match timeline-map expectation [${beatFragments[0].output_start}, ${beatFragments[0].output_end}]`
        );
      }
    }
  }

  // 6. Discover or load catalog for candidate resolution
  let catalogSlugs: Set<string> | null = null;
  try {
    const cat = options.catalog ?? discoverCatalog();
    catalogSlugs = new Set(cat.cards.map((c) => c.slug));
  } catch {
    // If catalog cannot be discovered (e.g. outside repo mount), catalog checks will warn or skip
    catalogSlugs = null;
  }

  // 7. Beat bounds, sequencing, and quality retrieval checks
  const EPS = 1e-4;
  let prevOutputEnd = plan.segment.output_start;
  const beatIds = new Set<string>();

  for (let i = 0; i < plan.beats.length; i++) {
    const beat = plan.beats[i];

    if (beatIds.has(beat.id)) {
      throw new Error(`Duplicate beat ID: '${beat.id}'`);
    }
    beatIds.add(beat.id);

    if (beat.output_start < plan.segment.output_start - EPS) {
      throw new Error(
        `Beat '${beat.id}' output_start (${beat.output_start}) is before plan segment output_start (${plan.segment.output_start})`
      );
    }
    if (beat.output_end > plan.segment.output_end + EPS) {
      throw new Error(
        `Beat '${beat.id}' output_end (${beat.output_end}) exceeds plan segment output_end (${plan.segment.output_end})`
      );
    }
    if (beat.source_start < plan.segment.source_start - EPS) {
      throw new Error(
        `Beat '${beat.id}' source_start (${beat.source_start}) is before plan segment source_start (${plan.segment.source_start})`
      );
    }
    if (beat.source_end > plan.segment.source_end + EPS) {
      throw new Error(
        `Beat '${beat.id}' source_end (${beat.source_end}) exceeds plan segment source_end (${plan.segment.source_end})`
      );
    }

    if (beat.output_start < prevOutputEnd - EPS) {
      throw new Error(
        `Beat '${beat.id}' overlaps previous beat (output_start ${beat.output_start} < previous output_end ${prevOutputEnd})`
      );
    }
    prevOutputEnd = beat.output_end;

    // 8. Visual vocabulary candidate retrieval and adaptation checks (C2.2 & C2.3)
    if (!beat.recipe_search) {
      throw new Error(
        `Beat '${beat.id}' is missing recipe_search discovery object`
      );
    }
    if (
      !Array.isArray(beat.recipe_search.candidate_refs) ||
      beat.recipe_search.candidate_refs.length === 0
    ) {
      throw new Error(
        `Beat '${beat.id}' recipe_search must contain candidate_refs shortlist`
      );
    }
    if (beat.recipe_search.candidate_refs.length > 5) {
      throw new Error(
        `Beat '${beat.id}' recipe_search candidate_refs exceeds maximum shortlist size of 5 (got ${beat.recipe_search.candidate_refs.length})`
      );
    }
    if (!beat.recipe_search.selected_ref) {
      throw new Error(
        `Beat '${beat.id}' recipe_search must declare a selected_ref`
      );
    }
    if (!beat.recipe_search.candidate_refs.includes(beat.recipe_search.selected_ref)) {
      throw new Error(
        `Beat '${beat.id}' selected_ref '${beat.recipe_search.selected_ref}' is not present in candidate_refs shortlist`
      );
    }

    // Validate that video-talkcraft candidate_refs and reference_basis resolve to discovered catalog entries
    if (catalogSlugs) {
      for (const ref of beat.recipe_search.candidate_refs) {
        if (ref.startsWith("video-talkcraft:")) {
          const slug = ref.slice("video-talkcraft:".length);
          if (!catalogSlugs.has(slug)) {
            throw new Error(
              `Beat '${beat.id}' references unknown video-talkcraft recipe '${ref}'. Recipe does not exist in discovered visual catalog.`
            );
          }
        }
      }
    }

    if (beat.adaptation_mode === "custom") {
      if (!beat.custom_reason || beat.custom_reason.trim().length < 5) {
        throw new Error(
          `Beat '${beat.id}' specifies adaptation_mode 'custom' but is missing custom_reason explaining why reuse/adapt was insufficient`
        );
      }
      if (
        !Array.isArray(beat.reference_basis) ||
        beat.reference_basis.length === 0
      ) {
        throw new Error(
          `Beat '${beat.id}' specifies adaptation_mode 'custom' but is missing reference_basis references`
        );
      }
      if (catalogSlugs) {
        for (const ref of beat.reference_basis) {
          if (ref.startsWith("video-talkcraft:")) {
            const slug = ref.slice("video-talkcraft:".length);
            if (!catalogSlugs.has(slug)) {
              throw new Error(
                `Beat '${beat.id}' reference_basis contains unknown recipe '${ref}'. Recipe does not exist in discovered visual catalog.`
              );
            }
          }
        }
      }
    }

    // 9. Grounding model and Category Compatibility Enforcement
    const grounding = beat.grounding;
    if (
      grounding.claim_type === "external_evidence" ||
      grounding.claim_type === "factual_technical"
    ) {
      if (!grounding.factual_category) {
        throw new Error(
          `Beat '${beat.id}' claims ${grounding.claim_type} but is missing factual_category`
        );
      }
      if (!Array.isArray(grounding.evidence_refs) || grounding.evidence_refs.length === 0) {
        throw new Error(
          `Beat '${beat.id}' claims ${grounding.claim_type} (${grounding.factual_category}) but does not reference any evidence in evidence_refs`
        );
      }

      // If mission is provided, verify manifest existence and CATEGORY COMPATIBILITY
      if (options.mission) {
        const manifestMap = new Map(
          options.mission.evidence_manifest.map((item) => [item.id, item])
        );
        for (const ref of grounding.evidence_refs) {
          const evidence = manifestMap.get(ref);
          if (!evidence) {
            throw new Error(
              `Grounding violation in beat '${beat.id}': referenced evidence ID '${ref}' does not exist in mission evidence manifest`
            );
          }

          // Strict category compatibility check
          if (!isEvidenceCompatible(grounding.factual_category, evidence.category)) {
            const allowed = CATEGORY_COMPATIBILITY[grounding.factual_category] ?? [];
            throw new Error(
              `Grounding incompatibility in beat '${beat.id}': factual_category '${grounding.factual_category}' cannot be proven by evidence '${evidence.id}' of category '${evidence.category}'. Compatible evidence categories: ${allowed.join(", ")}`
            );
          }
        }
      }
    } else if (grounding.claim_type === "transcript_grounded") {
      if (!grounding.transcript_range) {
        throw new Error(
          `Beat '${beat.id}' claims transcript_grounded but is missing transcript_range`
        );
      }
      const range = grounding.transcript_range;
      if (range.end <= range.start || !range.text.trim()) {
        throw new Error(
          `Beat '${beat.id}' has an invalid transcript_range [${range.start}..${range.end}]`
        );
      }
    }
  }
}
