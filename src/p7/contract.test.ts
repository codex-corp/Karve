import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TimelineMap } from "../p6/types.ts";
import {
  discoverCatalog,
  searchVisualVocabulary
} from "./catalog.ts";
import {
  buildVisualMission,
  validateMission,
  validateMissionSchema,
  validateSandboxPath,
  verifyEvidenceIntegrity
} from "./mission.ts";
import {
  getStyleProfile,
  KARVE_TECHNICAL_V1
} from "./style-profile.ts";
import type { VisualMission, VisualPlan } from "./types.ts";
import {
  validatePlanSchema,
  validateVisualPlan
} from "./validate-plan.ts";

function loadJson<T>(relativePath: string): T {
  const fullPath = resolve("src", "p7", "fixtures", relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

function runContractTests(): void {
  const techMission = loadJson<VisualMission>("tech-test-01.mission.json");
  const techPlan = loadJson<VisualPlan>("tech-test-01.visual-plan.json");
  const techTimeline = loadJson<TimelineMap>("tech-test-01.timeline-map.json");
  const cutTimeline = loadJson<TimelineMap>("sample-3-large.timeline-map.json");

  // ==========================================
  // Test 1: Positive Mission Validation
  // ==========================================
  console.log("-> Test 1: Validating canonical tech-test-01 mission fixture");
  const missionSchemaErrors = validateMissionSchema(techMission);
  assert.deepEqual(missionSchemaErrors, [], "tech-test-01 mission schema errors should be empty");
  assert.doesNotThrow(
    () => validateMission(techMission, techTimeline, { skipEvidenceFileCheck: true }),
    "Canonical mission should validate cleanly against timeline"
  );

  // ==========================================
  // Test 2: Positive Mission Builder with Timeline Mapping & Style Profile
  // ==========================================
  console.log("-> Test 2: Testing buildVisualMission with timeline mapping");
  const builtMission = buildVisualMission({
    projectId: "tech-test-01",
    profile: "source",
    mode: "technical_explainer",
    styleProfile: "karve-technical-v1",
    sourceRange: { start: 12.82, end: 31.92 },
    timelineMap: techTimeline,
    artifacts: techMission.artifacts,
    evidenceManifest: techMission.evidence_manifest,
    allowedOutputRoot: "/home/hany/karve-data/projects/tech-test-01/p7",
    skipEvidenceFileCheck: true
  });
  assert.equal(builtMission.segment.source_start, 12.82);
  assert.equal(builtMission.segment.source_end, 31.92);
  assert.equal(builtMission.segment.output_start, 12.82);
  assert.equal(builtMission.segment.output_end, 31.92);
  assert.equal(builtMission.segment.duration_seconds, 19.1);
  assert.equal(builtMission.style_profile, "karve-technical-v1");
  validateMission(builtMission, techTimeline, { skipEvidenceFileCheck: true });

  // ==========================================
  // Test 3: Positive Visual Plan Validation (with C2.2 & C2.3 Fields)
  // ==========================================
  console.log("-> Test 3: Validating canonical tech-test-01 visual plan fixture");
  const planSchemaErrors = validatePlanSchema(techPlan);
  assert.deepEqual(planSchemaErrors, [], "tech-test-01 plan schema errors should be empty");
  assert.doesNotThrow(
    () =>
      validateVisualPlan(techPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    "Canonical visual plan should validate cleanly against mission and timeline"
  );

  // ==========================================
  // Test 4: Negative - Factual technical beat missing evidence refs
  // ==========================================
  console.log("-> Test 4: Negative - factual technical beat with empty evidence_refs");
  const ungroundedPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  ungroundedPlan.beats[0].grounding.evidence_refs = [];
  const ungroundedSchemaErrors = validatePlanSchema(ungroundedPlan);
  assert.ok(
    ungroundedSchemaErrors.length > 0,
    "Schema should reject factual_technical with empty evidence_refs"
  );
  assert.throws(
    () =>
      validateVisualPlan(ungroundedPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    /claims factual_technical.*does not reference any evidence|validation failed/
  );

  // ==========================================
  // Test 5: Negative - Referenced evidence ID not in mission manifest
  // ==========================================
  console.log("-> Test 5: Negative - referenced evidence not in mission manifest");
  const unmanifestedPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  unmanifestedPlan.beats[0].grounding.evidence_refs = ["fake-nonexistent-id"];
  assert.throws(
    () =>
      validateVisualPlan(unmanifestedPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    /Grounding violation in beat '.*': referenced evidence ID 'fake-nonexistent-id' does not exist in mission evidence manifest/
  );

  // ==========================================
  // Test 6: Negative - Beat timing exceeds segment boundaries
  // ==========================================
  console.log("-> Test 6: Negative - beat timing exceeding mission segment");
  const outOfBoundsPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  outOfBoundsPlan.beats[3].source_end = 33.0;
  outOfBoundsPlan.beats[3].output_end = 33.0;
  assert.throws(
    () =>
      validateVisualPlan(outOfBoundsPlan, {
        mission: techMission
      }),
    /exceeds plan segment output_end/
  );

  // ==========================================
  // Test 7: Negative - Beat timeline inconsistency
  // ==========================================
  console.log("-> Test 7: Negative - beat output times do not match timeline map");
  const mismatchedPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  mismatchedPlan.beats[0].output_start = 10.0;
  assert.throws(
    () =>
      validateVisualPlan(mismatchedPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    /does not match timeline-map expectation/
  );

  // ==========================================
  // Test 8: Negative - Invalid visual job (fails JSON schema)
  // ==========================================
  console.log("-> Test 8: Negative - invalid visual job rejected by schema");
  const badJobPlan = JSON.parse(JSON.stringify(techPlan));
  badJobPlan.beats[0].visual_job = "unsupported_fancy_job";
  const badJobErrors = validatePlanSchema(badJobPlan);
  assert.ok(
    badJobErrors.length > 0,
    "Schema must reject unsupported visual_job"
  );

  // ==========================================
  // Test 9: Negative - Sandbox path violation
  // ==========================================
  console.log("-> Test 9: Negative - sandbox violation writing into canonical src/");
  assert.throws(
    () =>
      buildVisualMission({
        projectId: "tech-test-01",
        profile: "source",
        mode: "technical_explainer",
        sourceRange: { start: 12.82, end: 31.92 },
        timelineMap: techTimeline,
        artifacts: techMission.artifacts,
        allowedOutputRoot: "src/p7/generated",
        skipEvidenceFileCheck: true
      }),
    /Sandbox violation/
  );

  // ==========================================
  // Test 10: Negative - Range split across cuts in timeline map
  // ==========================================
  console.log("-> Test 10: Negative - range split across cuts in timeline map");
  assert.throws(
    () =>
      buildVisualMission({
        projectId: "sample-3-large",
        profile: "source",
        mode: "technical_explainer",
        sourceRange: { start: 19.0, end: 23.0 },
        timelineMap: cutTimeline,
        artifacts: techMission.artifacts,
        allowedOutputRoot: "/home/hany/karve-data/projects/sample-3-large/p7",
        skipEvidenceFileCheck: true
      }),
    /split across 2 cut segments/
  );

  // ==========================================
  // Test 11: Negative - Overlapping beats rejected
  // ==========================================
  console.log("-> Test 11: Negative - overlapping beats rejected");
  const overlappingPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  overlappingPlan.beats[1].source_start = 18.0;
  overlappingPlan.beats[1].output_start = 18.0;
  assert.throws(
    () =>
      validateVisualPlan(overlappingPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    /overlaps previous beat/
  );

  // ==========================================
  // Test 12 (C2.1): Visual Vocabulary Catalog Discovery
  // ==========================================
  console.log("-> Test 12 (C2.1): Dynamic discovery of video-talkcraft catalog");
  const catalog = discoverCatalog();
  assert.ok(catalog.total_cards > 0, "Catalog must discover cards dynamically from skill");
  console.log(`   Discovered ${catalog.total_cards} cards from ${catalog.source_root}`);
  assert.equal(catalog.total_cards, catalog.cards.length);

  // ==========================================
  // Test 13 (C2.2): Vocabulary Candidate Retrieval
  // ==========================================
  console.log("-> Test 13 (C2.2): Vocabulary candidate search & shortlisting");
  const searchArch = searchVisualVocabulary(catalog, {
    representation_kind: "architecture_diagram",
    visual_job: "explain",
    limit: 3
  });
  assert.ok(searchArch.length > 0 && searchArch.length <= 3, "Shortlist must be bounded (<= 3)");
  assert.ok(searchArch[0].card.slug, "Candidate must contain card slug");

  const searchTrans = searchVisualVocabulary(catalog, {
    representation_kind: "transition",
    visual_job: "transition",
    limit: 3
  });
  assert.ok(searchTrans.length > 0, "Must retrieve transition candidates");

  // ==========================================
  // Test 14 (C2.3): Custom Visuals Require custom_reason and reference_basis
  // ==========================================
  console.log("-> Test 14 (C2.3): Enforce reference-driven custom visuals");
  const invalidCustomPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  delete invalidCustomPlan.beats[0].custom_reason;
  delete invalidCustomPlan.beats[0].reference_basis;
  const customSchemaErrors = validatePlanSchema(invalidCustomPlan);
  assert.ok(
    customSchemaErrors.length > 0,
    "Schema must reject adaptation_mode 'custom' without custom_reason and reference_basis"
  );
  assert.throws(
    () => validateVisualPlan(invalidCustomPlan, { mission: techMission }),
    /custom_reason|reference_basis/
  );

  // ==========================================
  // Test 15 (C2.4): Visual Style Profile
  // ==========================================
  console.log("-> Test 15 (C2.4): Style profile validation (karve-technical-v1)");
  const profile = getStyleProfile("karve-technical-v1");
  assert.equal(profile.id, "karve-technical-v1");
  assert.equal(profile.host_pip.aspect_ratio, "16:9");
  assert.ok(profile.colors.accent_primary, "Accent color must be specified");
  assert.throws(() => getStyleProfile("nonexistent-profile"), /Unknown visual style profile/);

  // ==========================================
  // Test 16: Hardening - Evidence Asset File Integrity Check
  // ==========================================
  console.log("-> Test 16: Hardening - evidence asset file existence & checksum verification");
  const tempDir = mkdtempSync(join(tmpdir(), "karve-test-evidence-"));
  try {
    const evidenceFile = join(tempDir, "logo.svg");
    writeFileSync(evidenceFile, "<svg>logo</svg>", "utf8");
    const correctHash = createHash("sha256").update("<svg>logo</svg>").digest("hex");

    // Positive: valid file and hash
    assert.doesNotThrow(() => {
      verifyEvidenceIntegrity([
        {
          id: "test-logo",
          category: "brand_asset",
          description: "Test logo",
          path_or_uri: evidenceFile,
          sha256: correctHash
        }
      ]);
    });

    // Negative: missing file
    assert.throws(
      () =>
        verifyEvidenceIntegrity([
          {
            id: "missing-file",
            category: "brand_asset",
            description: "Missing",
            path_or_uri: join(tempDir, "does-not-exist.png")
          }
        ]),
      /Evidence asset integrity violation: evidence 'missing-file' points to missing file/
    );

    // Negative: checksum mismatch
    assert.throws(
      () =>
        verifyEvidenceIntegrity([
          {
            id: "corrupted-file",
            category: "brand_asset",
            description: "Corrupted",
            path_or_uri: evidenceFile,
            sha256: "0000000000000000000000000000000000000000000000000000000000000000"
          }
        ]),
      /checksum mismatch/
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  // ==========================================
  // Test 17: Hardening - Sandbox Realpath & Traversal
  // ==========================================
  console.log("-> Test 17: Hardening - sandbox path traversal and symlink prevention");
  // Test .. traversal escaping into src/
  assert.throws(
    () => validateSandboxPath("experiments/../src/components"),
    /Sandbox violation.*resolves inside forbidden path/
  );
  assert.throws(
    () => validateSandboxPath("remotion/components"),
    /Sandbox violation.*resolves inside forbidden path/
  );
  assert.doesNotThrow(() =>
    validateSandboxPath("/home/hany/karve-data/projects/tech-test-01/p7")
  );

  console.log("\nALL P7 CONTRACT & QUALITY TESTS PASSED! ✅\n");
}

runContractTests();
