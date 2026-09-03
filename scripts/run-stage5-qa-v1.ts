import * as fs from "fs";
import * as path from "path";

const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";

const qaV1 = {
  version: "v1",
  timestamp: new Date().toISOString(),
  reviewer_role: "Senior Visual QA & Technical Design Reviewer",
  evaluated_artifacts: {
    video: "db-index-explainer-v1.mp4",
    stills: [
      "still-1-opening-problem.png (frame 75)",
      "still-2-full-scan.png (frame 225)",
      "still-3-index-intro.png (frame 390)",
      "still-4-tree-narrowing.png (frame 530)",
      "still-5-matched-row.png (frame 710)",
      "still-6-performance-contrast.png (frame 800)",
      "still-7-final-takeaway.png (frame 870)"
    ]
  },
  assessment_criteria: {
    immediate_comprehension: {
      score: 8.5,
      notes: "The visual narrative follows a clear arc from unindexed scan to B-tree search and pointer lookup. The concept is intuitive and accessible."
    },
    composition_and_spacing: {
      score: 7.5,
      notes: "In Beats 1 and 2 (first 10 seconds), the table sits low at Y=720 leaving substantial empty vertical space in the center. In Beat 6, the contrast card overlaps the residual B-tree label."
    },
    focal_hierarchy: {
      score: 8.0,
      notes: "The orange accent color (#eb6c36) successfully draws the eye to the active search nodes and scanned rows."
    },
    semantic_correctness: {
      score: 7.0,
      notes: "CRITICAL: The physical table heap in storage has rows in already-sorted order (04, 09, 15... 99). Real database table heaps are UNORDERED. Showing an already-sorted table undermines why an index is necessary, as a developer might wonder why the engine doesn't just binary search the table directly. Physical rows must be scattered/unordered!"
    },
    graphical_craftsmanship: {
      score: 8.5,
      notes: "Clean paper/ink palette, precise 4px/40px grid, crisp SVG vector lines, and consistent border radiuses."
    },
    motion_clarity_and_pacing: {
      score: 8.5,
      notes: "Sequential scan speed and tree traversal timing are well balanced. Tree elimination is clear."
    },
    professional_polish: {
      score: 8.0,
      notes: "Avoids generic AI tropes and avoids looking like a SaaS web dashboard. Feels like an architectural engineering diagram."
    }
  },
  highest_impact_problems: [
    {
      id: "P1_UNORDERED_TABLE_HEAP",
      severity: "HIGH",
      title: "Physical storage rows appear pre-sorted",
      description: "In the storage heap, IDs are displayed sequentially [4, 9, 15, 23...]. In real databases without a clustered index, heap storage is physically unordered (e.g. [42, 9, 77, 15, 93, 4, 55, 31...]). Unordering the physical rows makes the necessity of an auxiliary ordered B-tree instantly obvious and semantically truthful."
    },
    {
      id: "P2_CENTER_STAGE_EMPTINESS",
      severity: "MEDIUM",
      title: "Empty center space in Beats 1-2",
      description: "During the first 10 seconds, before the B-tree appears, the center of the 1920x1080 canvas has minimal content. Adding a clear conceptual label explaining 'Heap Storage: Records stored in arbitrary insert order' and dynamic comparison badge ('42 ≠ 77 SKIP') will maintain strong viewer engagement."
    },
    {
      id: "P3_CONTRAST_CARD_CLEANUP",
      severity: "MEDIUM",
      title: "Background clutter behind Beat 6 contrast overlay",
      description: "In Beat 6 (frames 765+), the B-tree header text remains visible above the comparison modal. The B-tree and pointer elements should cleanly fade out as the contrast card transitions in."
    },
    {
      id: "P4_POINTER_BEAM_PRECISION",
      severity: "LOW",
      title: "Pointer beam target anchoring",
      description: "The pointer beam starts from the center of leaf [77|89] rather than specifically highlighting key 77 within that leaf, and the target row contact could have a more prominent landing reticle."
    }
  ],
  planned_corrections: [
    "Randomize/scatter table heap row order (e.g. [42, 09, 23, 89, 15, 93, 04, 71, 55, 31, 77, 99, 48, 82, 97, 63]) while maintaining target 77 at index 10. This proves why full scan must inspect every block and why sorted B-tree is required.",
    "Add animated scan comparison badges ('Checking ID 42... ≠ 77 (SKIP)') during Beat 2 in the center area to dynamically illustrate disk page comparison.",
    "Cleanly fade out the B-tree structure and pointers when the Performance Contrast overlay appears at frame 765.",
    "Refine B-tree leaf key highlight so key '77' inside leaf [77 | 89] is specifically accentuated, with the pointer beam originating precisely from key 77.",
    "Enhance landing pulse and RowID indicator on Row 77 when pointer connects."
  ],
  verdict: "NEEDS_TARGETED_IMPROVEMENT"
};

fs.writeFileSync(
  path.join(EXPERIMENT_DIR, "qa-v1.json"),
  JSON.stringify(qaV1, null, 2)
);

console.log("Saved qa-v1.json successfully!");
