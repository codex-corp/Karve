import { discoverCatalog, searchVisualVocabulary } from "../../src/p7/catalog.ts";
import type { P7VisualJob, RepresentationKind } from "../../src/p7/types.ts";

const catalog = discoverCatalog();
console.log(`=== CATALOG PROVENANCE ===`);
console.log(`Source: ${catalog.catalog_source}`);
console.log(`Fingerprint: ${catalog.catalog_fingerprint}`);
console.log(`Total Cards: ${catalog.total_cards}\n`);

const beats: Array<{
  id: string;
  name: string;
  visual_job: P7VisualJob;
  representation_kind: RepresentationKind;
  keyword?: string;
  adaptation_mode: "reuse" | "adapt" | "compose" | "custom";
  custom_reason?: string;
  reference_basis?: string[];
  selection_rationale: string;
}> = [
  {
    id: "beat-1",
    name: "Feature / Integration Announcement (12.82s - 19.40s)",
    visual_job: "explain",
    representation_kind: "architecture_diagram",
    keyword: "arrows",
    adaptation_mode: "custom",
    custom_reason: "Single pre-baked card cannot synchronize dual-badge embedding relationship core with host shrink yield simultaneously.",
    reference_basis: [
      "video-talkcraft:host-shrink-to-chip",
      "video-talkcraft:converging-arrows"
    ],
    selection_rationale: "Requires converging dual platform relationship arrows (WhatsApp & Telegram) connecting into the central capability node while the host shrinks into a native 16:9 PiP."
  },
  {
    id: "beat-2",
    name: "Everyday Use to Wider Ecosystem (19.40s - 24.96s)",
    visual_job: "demonstrate",
    representation_kind: "relationship_diagram",
    keyword: "orbit",
    adaptation_mode: "adapt",
    selection_rationale: "Adapts slow-pull-reveal camera motion and orbiting peripheral nodes around WhatsApp to illustrate 'عالم كتير كبير' without layout churn."
  },
  {
    id: "beat-3",
    name: "Forward-Looking Value & Optimism (24.96s - 29.50s)",
    visual_job: "emphasize",
    representation_kind: "emphasis",
    keyword: "badge",
    adaptation_mode: "adapt",
    selection_rationale: "Adapts count-badge-title and contrast styling to create a quiet upward value accent without keyword caption pop."
  },
  {
    id: "beat-4",
    name: "Direct Demo Handoff (29.50s - 31.92s)",
    visual_job: "transition",
    representation_kind: "transition",
    keyword: "wipe",
    adaptation_mode: "compose",
    selection_rationale: "Uses directional chevron motion without wiping over unverified demo screens."
  }
];

for (const beat of beats) {
  console.log(`=======================================================`);
  console.log(`BEAT: ${beat.name}`);
  console.log(`Job: ${beat.visual_job} | Kind: ${beat.representation_kind}`);
  console.log(`Adaptation Mode: ${beat.adaptation_mode}`);
  if (beat.custom_reason) console.log(`Custom Reason: ${beat.custom_reason}`);
  if (beat.reference_basis) console.log(`Reference Basis: ${beat.reference_basis.join(", ")}`);

  const results = searchVisualVocabulary(catalog, {
    representation_kind: beat.representation_kind,
    visual_job: beat.visual_job,
    keyword: beat.keyword,
    limit: 5
  });

  console.log(`Top Candidates:`);
  results.forEach((r, idx) => {
    console.log(`  ${idx + 1}. video-talkcraft:${r.card.slug} (score: ${r.score}) - ${r.card.title} [${r.card.category}]`);
  });
  console.log(`Selection Rationale: ${beat.selection_rationale}\n`);
}
