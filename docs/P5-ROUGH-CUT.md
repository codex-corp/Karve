# P5 — Rough Cut

## Status

**ACTIVE — IMPLEMENTATION NOT STARTED**

P0-P4 are closed as PASS. P5 is the first phase that applies real edit decisions to source media and produces a watchable cut.

P5 is intentionally deterministic. The semantic editor already ran in P4; P5 merges those decisions with mature OSS rough-cut tooling and executes the resulting timeline safely.

## Goal

Given a project containing:

```text
source.json
transcript.json
edit-plan.json
```

P5 should produce an auditable merged rough-cut timeline plus a watchable MP4 without clipping meaningful speech or breaking A/V sync.

## OSS-first requirement

Karve follows **adopt > adapt > build**.

Before writing a custom silence/dead-space engine, P5 must evaluate `WyattBlue/auto-editor` as the primary integration candidate. Prefer a pinned CLI/timeline interface over copying source code.

TightCut may be inspected for useful patterns such as safe padding, filler handling, cut merging, and caching. Do not adopt its complete pipeline or re-run Whisper because Karve already has a reusable transcript and word timestamps.

## Inputs and responsibilities

### P4 semantic input

P4 contributes:

- semantic `remove` ranges such as false starts/repeated takes;
- `keep` decisions that identify meaningful speech;
- evidence segment IDs and decision confidence;
- visual intents that must be preserved for P6 but not rendered in P5.

### Deterministic rough-cut input

P5 should use auto-editor or another justified deterministic method for measurable media properties such as:

- silence/dead-space proposals;
- optional audio-level based trimming;
- cut margins and joining behavior;
- deterministic timeline/export information.

Do not use the LLM to rediscover simple silence if a stable deterministic tool can measure it.

## Merge policy direction

The final P5 cut set must be explicit and auditable.

Initial merge principles:

1. P4 semantic `remove` decisions are strong cut proposals because they represent content meaning, retries, or false starts.
2. P4 `keep` decisions act as protection evidence when a deterministic silence/dead-space proposal overlaps meaningful speech.
3. Deterministic silence proposals may add cuts in P4-unspecified regions.
4. Unspecified P4 regions are **not** automatically removed.
5. Conflicts must be resolved deterministically and recorded rather than silently guessed.
6. Safe speech margins must be applied before rendering so consonants, breaths, and natural phrase boundaries are not clipped.
7. Overlapping/adjacent cut ranges should be normalized into a deterministic merged timeline.

The exact thresholds/margins are not fixed by this document; they must be measured on real Karve samples and kept configurable rather than buried in code.

## Planned artifacts

The exact names may be refined during implementation, but P5 should preserve this separation of concerns:

```text
project/
├── edit-plan.json            # P4 semantic source, unchanged
├── rough-cut-plan.json       # merged executable cut timeline
├── timeline-map.json         # source -> output mapping
├── rough-cut.mp4             # watchable P5 output
└── rough-cut.meta.json       # engine/version/settings/timing/manifest
```

The source video and P4/P3 artifacts are never overwritten.

## Timeline mapping

P6 captions and visual intents are expressed against source timestamps. Therefore P5 must produce enough mapping information to translate a source-time range into the rough-cut output timeline after cuts are removed.

This mapping must be deterministic and testable; do not attempt to reconstruct it later from rendered media.

## Rendering direction

Use FFmpeg for deterministic media execution unless auto-editor's selected integration/export path provides a cleaner auditable implementation. Avoid adding a second full rendering framework during P5.

P5 does not render:

- animated captions;
- punch-ins/zooms;
- title cards;
- callouts;
- explainers;
- Remotion motion graphics.

Those remain P6+ concerns.

## Quality gate

A technically valid MP4 is not sufficient. Manual review must confirm:

- obvious false starts/repeated takes selected by P4 are gone;
- deterministic dead space is removed where appropriate;
- meaningful speech is preserved;
- no word beginnings/endings are clipped;
- natural pauses are not over-aggressively removed;
- audio continuity is acceptable;
- A/V sync is intact;
- the pacing feels better than the raw source rather than robotic;
- the timeline map correctly represents the executed cuts.

## Representative gate sources

Use at least:

- `real-p2` because P4 identified multiple false-start removals;
- `sample-3-large` because P4 mostly preserved the emotional narrative and removed only a small silence gap.

These two sources test opposite behavior: aggressive semantic cleanup versus conservative preservation.

## P5 acceptance gate

P5 becomes PASS only when:

1. the chosen auto-editor version/license/integration path is documented and pinned;
2. no duplicate ASR stage is introduced;
3. deterministic rough-cut proposals can be inspected before rendering;
4. P4 semantic cuts and deterministic proposals merge reproducibly;
5. source-to-output timeline mapping is generated and verified;
6. the representative projects render successfully;
7. A/V sync and audio continuity pass;
8. manual review accepts the pacing and cut boundaries;
9. the original source, transcript, and edit plan remain unchanged.

No P6 implementation begins before this gate.
