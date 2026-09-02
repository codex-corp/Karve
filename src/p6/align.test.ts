/**
 * Tests for the caption correction alignment engine.
 *
 * Covers: 1:1, 1:N, N:1, N:M replacements,
 * out-of-bounds checks, overlap detection, original_text validation,
 * passthrough when no corrections exist, and low-confidence flagging.
 */

import { strict as assert } from "node:assert";
import {
  applyCorrections,
  flattenTranscriptWords,
  type TranscriptWord,
  type CaptionCorrections
} from "./align.ts";

function makeWord(
  text: string,
  start: number,
  end: number,
  globalIndex: number,
  segmentId = 1,
  probability = 0.9
): TranscriptWord {
  return { text, start, end, probability, segment_id: segmentId, global_index: globalIndex };
}

function makeCorrections(
  projectId: string,
  corrections: CaptionCorrections["corrections"]
): CaptionCorrections {
  return { schema_version: 1, project_id: projectId, corrections };
}

const PROJECT = "test-project";

// ── Test: Passthrough (no corrections) ────────────────────────────────────────

function testPassthrough(): void {
  const words = [
    makeWord("مرحبا", 0.0, 1.0, 0),
    makeWord("أنا", 1.0, 1.5, 1),
    makeWord("فهد", 1.5, 2.0, 2)
  ];

  const result = applyCorrections(words, null, PROJECT);
  assert.equal(result.words.length, 3);
  assert.equal(result.corrections_applied, 0);
  assert.equal(result.corrections_skipped, 0);
  assert.equal(result.flagged_for_review.length, 0);
  for (let i = 0; i < words.length; i++) {
    assert.equal(result.words[i].display_text, words[i].text);
    assert.equal(result.words[i].corrected, false);
    assert.equal(result.words[i].start, words[i].start);
    assert.equal(result.words[i].end, words[i].end);
  }
  console.log("  ✓ passthrough (no corrections)");
}

// ── Test: Empty corrections array ─────────────────────────────────────────────

function testEmptyCorrections(): void {
  const words = [makeWord("كلمة", 0.0, 1.0, 0)];
  const corrections = makeCorrections(PROJECT, []);
  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 1);
  assert.equal(result.corrections_applied, 0);
  assert.equal(result.words[0].display_text, "كلمة");
  console.log("  ✓ empty corrections array");
}

// ── Test: 1:1 replacement ─────────────────────────────────────────────────────

function testOneToOne(): void {
  const words = [
    makeWord("مرحبا", 0.0, 1.0, 0),
    makeWord("مفترب", 2.0, 2.5, 1),
    makeWord("عن", 2.5, 3.0, 2)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 1,
      source_word_end: 1,
      original_text: "مفترب",
      replacement: ["مغترب"],
      reason: "phonetic_asr_error",
      confidence: 0.97
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 3);
  assert.equal(result.corrections_applied, 1);
  assert.equal(result.words[0].display_text, "مرحبا");
  assert.equal(result.words[0].corrected, false);
  assert.equal(result.words[1].display_text, "مغترب");
  assert.equal(result.words[1].raw_text, "مفترب");
  assert.equal(result.words[1].corrected, true);
  assert.equal(result.words[1].start, 2.0);
  assert.equal(result.words[1].end, 2.5);
  assert.equal(result.words[2].display_text, "عن");
  assert.equal(result.words[2].corrected, false);
  console.log("  ✓ 1:1 replacement");
}

// ── Test: N:1 replacement (2 words merged into 1) ─────────────────────────────

function testNToOne(): void {
  const words = [
    makeWord("بال", 0.0, 0.3, 0),
    makeWord("شارع", 0.3, 0.8, 1),
    makeWord("ثاني", 0.8, 1.2, 2)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 0,
      source_word_end: 1,
      original_text: "بال شارع",
      replacement: ["بالشارع"],
      reason: "wrong_word_boundary",
      confidence: 0.95
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 2);
  assert.equal(result.corrections_applied, 1);
  assert.equal(result.words[0].display_text, "بالشارع");
  assert.equal(result.words[0].start, 0.0);
  assert.equal(result.words[0].end, 0.8);
  assert.equal(result.words[1].display_text, "ثاني");
  console.log("  ✓ N:1 replacement (merge)");
}

// ── Test: 1:N replacement (1 word split into 2) ──────────────────────────────

function testOneToN(): void {
  const words = [
    makeWord("أول", 0.0, 0.5, 0),
    makeWord("بالبيت", 1.0, 2.0, 1),
    makeWord("كان", 2.0, 2.5, 2)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 1,
      source_word_end: 1,
      original_text: "بالبيت",
      replacement: ["في", "البيت"],
      reason: "wrong_word_boundary",
      confidence: 0.88
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 4);
  assert.equal(result.corrections_applied, 1);
  assert.equal(result.words[0].display_text, "أول");
  assert.equal(result.words[1].display_text, "في");
  assert.equal(result.words[1].start, 1.0);
  assert.equal(result.words[1].end, 1.5);
  assert.equal(result.words[2].display_text, "البيت");
  assert.equal(result.words[2].start, 1.5);
  assert.equal(result.words[2].end, 2.0);
  assert.equal(result.words[3].display_text, "كان");
  console.log("  ✓ 1:N replacement (split)");
}

// ── Test: N:M replacement ────────────────────────────────────────────────────

function testNToM(): void {
  const words = [
    makeWord("يا", 0.0, 0.3, 0),
    makeWord("حبيبي", 0.3, 0.8, 1),
    makeWord("شلون", 0.8, 1.2, 2),
    makeWord("كيفك", 1.2, 1.6, 3)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 1,
      source_word_end: 2,
      original_text: "حبيبي شلون",
      replacement: ["حبيبي", "شلونك", "اليوم"],
      reason: "phonetic_asr_error",
      confidence: 0.82
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  // يا + (حبيبي شلونك اليوم) + كيفك = 5
  assert.equal(result.words.length, 5);
  assert.equal(result.corrections_applied, 1);
  assert.equal(result.words[0].display_text, "يا");
  assert.equal(result.words[1].display_text, "حبيبي");
  assert.equal(result.words[2].display_text, "شلونك");
  assert.equal(result.words[3].display_text, "اليوم");
  // Timing should span from 0.3 to 1.2, split into 3.
  assert.ok(Math.abs(result.words[1].start - 0.3) < 1e-5);
  assert.ok(Math.abs(result.words[3].end - 1.2) < 1e-5);
  assert.equal(result.words[4].display_text, "كيفك");
  console.log("  ✓ N:M replacement");
}

// ── Test: Multiple corrections ───────────────────────────────────────────────

function testMultipleCorrections(): void {
  const words = [
    makeWord("مفترب", 0.0, 0.5, 0),
    makeWord("عن", 0.5, 0.8, 1),
    makeWord("سوريا", 0.8, 1.2, 2),
    makeWord("لحشتك", 1.5, 2.0, 3),
    makeWord("خاصة", 2.0, 2.5, 4)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 0,
      source_word_end: 0,
      original_text: "مفترب",
      replacement: ["مغترب"],
      reason: "phonetic_asr_error",
      confidence: 0.97
    },
    {
      source_word_start: 3,
      source_word_end: 3,
      original_text: "لحشتك",
      replacement: ["لهجتك"],
      reason: "phonetic_asr_error",
      confidence: 0.94
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 5);
  assert.equal(result.corrections_applied, 2);
  assert.equal(result.words[0].display_text, "مغترب");
  assert.equal(result.words[1].display_text, "عن");
  assert.equal(result.words[2].display_text, "سوريا");
  assert.equal(result.words[3].display_text, "لهجتك");
  assert.equal(result.words[4].display_text, "خاصة");
  console.log("  ✓ multiple non-overlapping corrections");
}

// ── Test: Overlapping corrections throw ──────────────────────────────────────

function testOverlappingCorrections(): void {
  const words = [
    makeWord("أ", 0.0, 0.2, 0),
    makeWord("ب", 0.2, 0.4, 1),
    makeWord("ج", 0.4, 0.6, 2)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 0,
      source_word_end: 1,
      original_text: "أ ب",
      replacement: ["أب"],
      reason: "wrong_word_boundary",
      confidence: 0.9
    },
    {
      source_word_start: 1,
      source_word_end: 2,
      original_text: "ب ج",
      replacement: ["بج"],
      reason: "wrong_word_boundary",
      confidence: 0.9
    }
  ]);

  try {
    applyCorrections(words, corrections, PROJECT);
    assert.fail("Should have thrown on overlapping corrections");
  } catch (error) {
    assert.ok(
      error instanceof Error && error.message.includes("overlap"),
      `Expected overlap error, got: ${String(error)}`
    );
  }
  console.log("  ✓ overlapping corrections throw");
}

// ── Test: Out of bounds index throws ─────────────────────────────────────────

function testOutOfBounds(): void {
  const words = [makeWord("كلمة", 0.0, 1.0, 0)];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 5,
      source_word_end: 5,
      original_text: "غريب",
      replacement: ["صحيح"],
      reason: "phonetic_asr_error",
      confidence: 0.9
    }
  ]);

  try {
    applyCorrections(words, corrections, PROJECT);
    assert.fail("Should have thrown on out-of-bounds index");
  } catch (error) {
    assert.ok(
      error instanceof Error && error.message.includes("out of bounds"),
      `Expected bounds error, got: ${String(error)}`
    );
  }
  console.log("  ✓ out-of-bounds index throws");
}

// ── Test: Mismatched original_text skips gracefully ──────────────────────────

function testOriginalTextMismatch(): void {
  const words = [
    makeWord("صح", 0.0, 0.5, 0),
    makeWord("كلام", 0.5, 1.0, 1)
  ];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 0,
      source_word_end: 0,
      original_text: "خطأ",
      replacement: ["تصحيح"],
      reason: "phonetic_asr_error",
      confidence: 0.9
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.words.length, 2);
  assert.equal(result.corrections_applied, 0);
  assert.equal(result.corrections_skipped, 1);
  assert.equal(result.words[0].display_text, "صح");
  assert.equal(result.words[0].corrected, false);
  console.log("  ✓ original_text mismatch skips gracefully");
}

// ── Test: Low confidence flagged for review ──────────────────────────────────

function testLowConfidenceFlagged(): void {
  const words = [makeWord("كلمة", 0.0, 1.0, 0)];
  const corrections = makeCorrections(PROJECT, [
    {
      source_word_start: 0,
      source_word_end: 0,
      original_text: "كلمة",
      replacement: ["كلمات"],
      reason: "phonetic_asr_error",
      confidence: 0.55
    }
  ]);

  const result = applyCorrections(words, corrections, PROJECT);
  assert.equal(result.corrections_applied, 1);
  assert.equal(result.flagged_for_review.length, 1);
  assert.equal(result.flagged_for_review[0].confidence, 0.55);
  console.log("  ✓ low confidence flagged for review");
}

// ── Test: Project ID mismatch throws ─────────────────────────────────────────

function testProjectIdMismatch(): void {
  const words = [makeWord("كلمة", 0.0, 1.0, 0)];
  const corrections = makeCorrections("wrong-project", [
    {
      source_word_start: 0,
      source_word_end: 0,
      original_text: "كلمة",
      replacement: ["صح"],
      reason: "phonetic_asr_error",
      confidence: 0.9
    }
  ]);

  try {
    applyCorrections(words, corrections, PROJECT);
    assert.fail("Should have thrown on project ID mismatch");
  } catch (error) {
    assert.ok(
      error instanceof Error && error.message.includes("project_id"),
      `Expected project mismatch error, got: ${String(error)}`
    );
  }
  console.log("  ✓ project ID mismatch throws");
}

// ── Test: flattenTranscriptWords ─────────────────────────────────────────────

function testFlatten(): void {
  const segments = [
    {
      id: 1,
      words: [
        { text: "مرحبا", start: 0.0, end: 1.0, probability: 0.9 },
        { text: "أنا", start: 1.0, end: 1.5, probability: 0.8 }
      ]
    },
    {
      id: 2,
      words: [
        { text: "فهد", start: 2.0, end: 2.5, probability: 0.95 }
      ]
    }
  ];

  const flat = flattenTranscriptWords(segments);
  assert.equal(flat.length, 3);
  assert.equal(flat[0].global_index, 0);
  assert.equal(flat[0].segment_id, 1);
  assert.equal(flat[1].global_index, 1);
  assert.equal(flat[1].segment_id, 1);
  assert.equal(flat[2].global_index, 2);
  assert.equal(flat[2].segment_id, 2);
  console.log("  ✓ flattenTranscriptWords");
}

// ── Run all ──────────────────────────────────────────────────────────────────

console.log("P6-B alignment tests:");
testPassthrough();
testEmptyCorrections();
testOneToOne();
testNToOne();
testOneToN();
testNToM();
testMultipleCorrections();
testOverlappingCorrections();
testOutOfBounds();
testOriginalTextMismatch();
testLowConfidenceFlagged();
testProjectIdMismatch();
testFlatten();
console.log("\nP6-B alignment tests: PASS");
