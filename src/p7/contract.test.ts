import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TimelineMap } from "../p6/types.ts";
import {
  discoverCatalog,
  resolveCatalogRoot,
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
  KARVE_TECHNICAL_V1,
  resolveStyleTokens
} from "./style-profile.ts";
import type { VisualMission, VisualPlan } from "./types.ts";
import {
  isEvidenceCompatible,
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
    "Schema should reject external_evidence with empty evidence_refs"
  );
  assert.throws(
    () =>
      validateVisualPlan(ungroundedPlan, {
        mission: techMission,
        timelineMap: techTimeline
      }),
    /claims external_evidence.*does not reference any evidence|validation failed/
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
  // Test 12 (C2.1): Visual Vocabulary Catalog Discovery & Provenance
  // ==========================================
  console.log("-> Test 12 (C2.1): Dynamic discovery of video-talkcraft catalog with provenance");
  const catalog = discoverCatalog();
  assert.ok(catalog.total_cards > 0, "Catalog must discover cards dynamically from skill");
  assert.ok(catalog.catalog_source.includes("video-talkcraft"), "Catalog source must be auditable");
  assert.ok(/^[a-f0-9]{64}$/.test(catalog.catalog_fingerprint), "Catalog fingerprint must be a 64-char SHA256");
  console.log(`   Discovered ${catalog.total_cards} cards (fingerprint: ${catalog.catalog_fingerprint.slice(0, 12)}...)`);
  assert.equal(catalog.total_cards, catalog.cards.length);

  // Test catalog root resolution
  const resolvedRoot = resolveCatalogRoot();
  assert.ok(resolvedRoot.length > 0);

  // ==========================================
  // Test 13 (C2.2): Vocabulary Candidate Search & Shortlist Bounds
  // ==========================================
  console.log("-> Test 13 (C2.2): Vocabulary candidate search & shortlist bounds");
  const searchArch = searchVisualVocabulary(catalog, {
    representation_kind: "architecture_diagram",
    visual_job: "explain",
    limit: 3
  });
  assert.ok(searchArch.length > 0 && searchArch.length <= 3, "Shortlist must be bounded (<= 3)");
  assert.ok(searchArch[0].card.slug, "Candidate must contain card slug");

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
  // Test 15 (C2.4): Visual Style Profile Scaling & Responsive Contract
  // ==========================================
  console.log("-> Test 15 (C2.4): Style profile scaling (1080p, 720p, 9:16 vertical reel)");
  const profile = getStyleProfile("karve-technical-v1");
  assert.equal(profile.id, "karve-technical-v1");
  assert.equal(profile.reference_canvas.width, 1920);
  assert.equal(profile.reference_canvas.height, 1080);
  assert.equal(profile.colors.accent_primary, "#38BDF8");

  // Test 1920x1080 reference scale (factor = 1.0)
  const tokens1080p = resolveStyleTokens(profile, { width: 1920, height: 1080 });
  assert.equal(tokens1080p.scale_factor, 1.0);
  assert.equal(tokens1080p.typography.scale.title, 72);
  assert.equal(tokens1080p.host_pip.width_px, 480);
  assert.equal(tokens1080p.host_pip.height_px, 270);

  // Test 1280x720 downscaled landscape (factor ~ 0.667)
  const tokens720p = resolveStyleTokens(profile, { width: 1280, height: 720 });
  assert.ok(tokens720p.scale_factor < 1.0 && tokens720p.scale_factor > 0.6);
  assert.equal(tokens720p.host_pip.width_px, 320);
  assert.equal(tokens720p.host_pip.height_px, 180);
  assert.ok(tokens720p.typography.scale.title >= 48, "720p title typography must stay broadcast-readable");

  // Test 1080x1920 vertical reel (mobile readability boost applied)
  const tokensReel = resolveStyleTokens(profile, { width: 1080, height: 1920 });
  assert.ok(tokensReel.typography.scale.micro >= 13, "Mobile micro text must remain readable");
  assert.ok(tokensReel.typography.scale.body >= 20, "Mobile body text must remain readable");

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

  // ==========================================
  // Test 18 (NEW): Grounding Category Compatibility & Transcript Grounding
  // ==========================================
  console.log("-> Test 18: Grounding category compatibility enforcement");
  // Negative: brand_asset cannot prove product_capability!
  const incompatiblePlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  incompatiblePlan.beats[0].grounding.factual_category = "product_capability";
  assert.throws(
    () => validateVisualPlan(incompatiblePlan, { mission: techMission }),
    /Grounding incompatibility in beat 'feature-announcement': factual_category 'product_capability' cannot be proven by evidence 'whatsapp-badge' of category 'brand_asset'/
  );

  // Compatibility helper checks
  assert.equal(isEvidenceCompatible("product_capability", "brand_asset"), false);
  assert.equal(isEvidenceCompatible("product_capability", "real_ui"), true);
  assert.equal(isEvidenceCompatible("product_capability", "real_code"), true);
  assert.equal(isEvidenceCompatible("brand_asset", "brand_asset"), true);
  assert.equal(isEvidenceCompatible("real_code", "real_code"), true);

  // Positive: transcript-grounded beat validates with valid transcript_range
  const transcriptPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  transcriptPlan.beats[0].grounding = {
    claim_type: "transcript_grounded",
    transcript_range: {
      start: 12.82,
      end: 19.4,
      text: "أطلقت ميزة هي تضمين داخل واتساب وتيليجرام"
    }
  };
  assert.doesNotThrow(() =>
    validateVisualPlan(transcriptPlan, { mission: techMission })
  );

  // ==========================================
  // Test 19 (NEW): Recipe candidate validation against discovered catalog
  // ==========================================
  console.log("-> Test 19: Recipe candidates resolution against catalog");
  // Negative: unknown recipe ref in video-talkcraft namespace
  const unknownRecipePlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  unknownRecipePlan.beats[0].recipe_search.candidate_refs = [
    "video-talkcraft:fake-nonexistent-recipe"
  ];
  unknownRecipePlan.beats[0].recipe_search.selected_ref =
    "video-talkcraft:fake-nonexistent-recipe";
  assert.throws(
    () => validateVisualPlan(unknownRecipePlan, { mission: techMission, catalog }),
    /references unknown video-talkcraft recipe 'video-talkcraft:fake-nonexistent-recipe'/
  );

  // Negative: selected_ref not in candidate_refs shortlist
  const unselectedPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  unselectedPlan.beats[0].recipe_search.selected_ref = "video-talkcraft:caret-wipe-transition";
  assert.throws(
    () => validateVisualPlan(unselectedPlan, { mission: techMission, catalog }),
    /selected_ref '.*' is not present in candidate_refs shortlist/
  );

  // Negative: shortlist size exceeds maximum of 5
  const longShortlistPlan: VisualPlan = JSON.parse(JSON.stringify(techPlan));
  longShortlistPlan.beats[0].recipe_search.candidate_refs = [
    "video-talkcraft:callout-line-label",
    "video-talkcraft:host-shrink-to-chip",
    "video-talkcraft:converging-arrows",
    "video-talkcraft:slow-pull-reveal",
    "video-talkcraft:orbit-drift",
    "video-talkcraft:pip-zoom-box" // 6 items
  ];
  assert.throws(
    () => validateVisualPlan(longShortlistPlan, { mission: techMission, catalog }),
    /candidate_refs exceeds maximum shortlist size of 5|validation failed/
  );

  // ==========================================
  // Test 20 (NEW): Deterministic Golden Retrieval Quality Tests
  // ==========================================
  console.log("-> Test 20: Golden retrieval quality test matrix (6 categories)");

  // 1. Architecture / Process flow explanation
  const goldArch = searchVisualVocabulary(catalog, {
    representation_kind: "architecture_diagram",
    visual_job: "explain",
    limit: 5
  });
  const goldArchSlugs = goldArch.map((r) => r.card.slug);
  assert.ok(
    goldArchSlugs.some((slug) =>
      ["converging-arrows", "step-timeline-vertical", "numbered-step-stack", "orbit-drift"].includes(slug)
    ),
    `Architecture explanation query must retrieve relevant diagram recipes, got: ${goldArchSlugs.join(", ")}`
  );

  // 2. Data / Chart
  const goldData = searchVisualVocabulary(catalog, {
    representation_kind: "data_chart",
    visual_job: "prove",
    limit: 5
  });
  const goldDataSlugs = goldData.map((r) => r.card.slug);
  assert.ok(
    goldDataSlugs.some((slug) =>
      ["bar-chart-growth", "chart-grow", "line-chart-story-draw"].includes(slug)
    ),
    `Data chart query must retrieve chart recipes, got: ${goldDataSlugs.join(", ")}`
  );

  // 3. Code / Terminal
  const goldTerm = searchVisualVocabulary(catalog, {
    representation_kind: "terminal",
    visual_job: "demonstrate",
    limit: 3
  });
  assert.equal(
    goldTerm[0].card.slug,
    "terminal-typing-log",
    "Terminal query must retrieve terminal-typing-log at rank 1"
  );

  // 4. Real UI / Tutorial
  const goldUI = searchVisualVocabulary(catalog, {
    representation_kind: "real_ui",
    visual_job: "demonstrate",
    limit: 5
  });
  const goldUISlugs = goldUI.map((r) => r.card.slug);
  assert.ok(
    goldUISlugs.some((slug) =>
      ["cursor-actor-demo", "ui-flow-theater", "ui-prop-theater"].includes(slug)
    ),
    `Real UI query must retrieve UI theater/cursor recipes, got: ${goldUISlugs.join(", ")}`
  );

  // 5. Screenshot annotation
  const goldAnnot = searchVisualVocabulary(catalog, {
    representation_kind: "screenshot_annotation",
    visual_job: "emphasize",
    limit: 5
  });
  const goldAnnotSlugs = goldAnnot.map((r) => r.card.slug);
  assert.ok(
    goldAnnotSlugs.some((slug) =>
      ["callout-line-label", "focus-dim-spotlight", "magnifier-detail", "highlighter-sweep"].includes(slug)
    ),
    `Screenshot annotation query must retrieve callout/magnifier/spotlight recipes, got: ${goldAnnotSlugs.join(", ")}`
  );

  // 6. Transition
  const goldTrans = searchVisualVocabulary(catalog, {
    representation_kind: "transition",
    visual_job: "transition",
    limit: 5
  });
  const goldTransSlugs = goldTrans.map((r) => r.card.slug);
  assert.ok(
    goldTransSlugs.some((slug) =>
      ["push-through-transition", "caret-wipe-transition", "pullback-cool-transition", "whip-pan-transition"].includes(slug)
    ),
    `Transition query must retrieve standard motion transition recipes, got: ${goldTransSlugs.join(", ")}`
  );

  console.log("\nALL P7 CONTRACT, RETRIEVAL & QUALITY TESTS PASSED! ✅\n");
}

runContractTests();
