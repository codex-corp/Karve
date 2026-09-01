# P5 — Rough Cut

## Status

**IMPLEMENTED — REAL WSL/AUTO-EDITOR QUALITY GATE PENDING**

P0-P4 are closed as PASS. P5 is the first phase that applies real edit decisions to source media and produces a watchable cut.

P5 stays deterministic: P4 decides semantic intent, `auto-editor` measures audio dead space, Karve merges both timelines with explicit conflict rules, and FFmpeg renders the final rough cut.

## Goal

Given a project containing:

```text
source.json
transcript.json
edit-plan.json
```

plus the original source video supplied read-only at run time, P5 produces:

```text
auto-editor-silence.v1
rough-cut-plan.json
timeline-map.json
rough-cut.meta.json
rough-cut.mp4
```

The original source, transcript, and edit plan are never overwritten.

## OSS decision — auto-editor

Karve adopts `WyattBlue/auto-editor` directly instead of implementing a custom loudness/silence detector.

Pinned P5 version:

```text
auto-editor 31.5.0
release: 2026-08-13
platform artifact: auto-editor-linux-x86_64
sha256: 9c93cd57f8e29631355b96e97b081beddc95972119ceab43111656dd09a31dc5
```

The upstream repository is released under the Unlicense/public domain. The official release binary may bundle third-party dependencies under their own licenses; re-check those licenses before redistributing Karve with the binary. Local development/runtime use does not require copying auto-editor source into Karve.

P5 intentionally uses auto-editor's stable **v1 timeline export**. Upstream documents v1 as a stable, single-source linear timeline format with `chunks` containing start/end ticks and speed, where speed `0`/`99999` means cut.

Karve does **not** use auto-editor transcription. P3 faster-whisper remains the single ASR stage.

## Why v1 instead of v3

P5 only needs linear keep/cut proposals. The v1 format is smaller and explicitly documented as stable for programmatic cut timelines. P6+ owns nonlinear visual composition, so adopting auto-editor v3 layers in P5 would add unnecessary coupling.

## Deterministic audio proposal profile

Versioned settings live in `config/p5-defaults.json`.

Initial conservative baseline:

```text
audio threshold:       0.04
active margin:         0.12 s
minimum silence cut:   0.35 s
minimum active clip:   0 s
```

Equivalent auto-editor analysis shape:

```bash
auto-editor audio.wav \
  --edit audio:threshold=0.04 \
  --margin 0.12s \
  --smooth 0.35s,0s \
  --export v1
```

`audio.wav` is the existing P2 16 kHz mono artifact. This keeps detection local, cheap, and reproducible without re-reading the video or running ASR again.

The thresholds are configuration, not permanent taste rules. They must be judged on real Karve videos before P5 closes.

## Merge policy

Karve turns P4 + auto-editor proposals into one auditable cut set.

1. Adjacent/overlapping P4 semantic `remove` ranges are merged first.
2. Semantic removals get a small outer-boundary safety margin (`0.08 s` by default) so segment-boundary estimates do not clip neighboring speech. A removal that begins at source time zero or ends at the source duration still reaches the true edge.
3. P4 `keep` ranges are expanded by `0.08 s` and act as protection only against deterministic auto-editor silence proposals.
4. Auto-editor silence proposals that overlap protected keep regions are split/subtracted instead of overriding the semantic keep.
5. Very small auto-editor-only fragments below `0.18 s` are ignored after conflict resolution.
6. Semantic + deterministic cuts are normalized and merged with a small adjacency gap (`0.05 s`).
7. Every final cut records provenance (`semantic`, `auto_editor`) and semantic reason codes where applicable.
8. Unspecified P4 regions are kept unless an explicit deterministic silence proposal removes them.

P4 visual intents are copied into `rough-cut-plan.json` as metadata only. P5 does not render them.

## Planning before rendering

Inspect the exact executable plan without rendering:

```bash
bash scripts/p5-run.sh <project-id> <source-video> --plan-only
jq . ~/karve-data/projects/<project-id>/rough-cut-plan.json
jq . ~/karve-data/projects/<project-id>/timeline-map.json
```

Then render with `--force` after inspection:

```bash
bash scripts/p5-run.sh <project-id> <source-video> --force
```

This gives P5 an explicit review point before media execution.

## Source identity check

P2 does not copy the original source into persistent project storage. P5 therefore receives the source path explicitly and mounts it read-only.

Before editing, Karve verifies:

- file size equals `source.json`;
- source duration remains within `0.15 s` of the P2 measurement;
- at least one video and one audio stream exist.

P5 records a SHA-256 of the supplied source in `rough-cut.meta.json` for future reproducibility.

## Timeline mapping

`timeline-map.json` is generated from the final kept ranges, not reconstructed from the rendered file.

Each segment records:

```text
source_start
source_end
output_start
output_end
```

Kept segments are contiguous on the output timeline and preserve duration exactly. This is the source-time -> rough-cut-time bridge P6 will use for captions and visual intents.

## Rendering

FFmpeg remains the deterministic media executor. P5 creates trim/atrim segments from the final kept ranges, resets timestamps, concatenates them, and encodes a standard MP4:

```text
video: libx264 / CRF 20 / veryfast / yuv420p
audio: AAC 160k
faststart: enabled
```

Auto-editor is used for what it is strong at — dead-space analysis and a stable timeline export — while FFmpeg remains Karve's existing media boundary.

## Artifacts

### `auto-editor-silence.v1`
Raw upstream deterministic analysis output. Kept for audit/debugging.

### `rough-cut-plan.json`
Contains settings, P4 semantic proposals, raw auto-editor silence proposals, keep-protected proposals, final cuts, kept ranges, output duration, provenance, and carried P4 visual intents.

### `timeline-map.json`
Deterministic mapping from source-time kept segments to output-time segments.

### `rough-cut.meta.json`
Records auto-editor/FFmpeg versions, source hash/metadata, hashes of `source.json`/`transcript.json`/`edit-plan.json`, settings, proposal/cut counts, planned duration, and render timing.

### `rough-cut.mp4`
Watchable P5 output.

## Verification

Run:

```bash
bash scripts/p5-verify.sh <project-id>
```

The verifier checks:

- final cuts and kept ranges are ordered, in-bounds, and cover the full source without gaps/overlap;
- timeline-map segments match kept ranges and are contiguous in output time;
- source/transcript/edit-plan hashes still match the versions used by P5;
- rough-cut contains both video and audio;
- rendered duration matches planned output within `0.25 s`.

Pure merge/timeline logic also has a container-side regression test:

```bash
bash scripts/p5-logic-test.sh
```

## Development-side verification

Before the real host gate, P5 was exercised with:

- shell syntax validation;
- pure TypeScript timeline regression tests;
- a mocked auto-editor v1 producer;
- a synthetic 6-second A/V source rendered through real FFmpeg;
- semantic cut + deterministic silence merge;
- P4 keep protection splitting a silence proposal;
- source-to-output timeline generation;
- full `rough-cut.mp4` render;
- standalone P5 verification including artifact hashes and duration.

The development mock validates Karve's adapter/merge/render logic. It does **not** substitute for running the pinned real auto-editor binary on the user's actual WSL/Docker host.

## Real-host gate

Rebuild once because the image now contains the pinned auto-editor binary:

```bash
git pull
bash scripts/bootstrap.sh
bash scripts/p5-logic-test.sh
```

### Gate A — aggressive cleanup (`real-p2`)

First inspect:

```bash
bash scripts/p5-run.sh real-p2 videos/test-video.mp4 --plan-only
jq . ~/karve-data/projects/real-p2/rough-cut-plan.json
```

Then render:

```bash
bash scripts/p5-run.sh real-p2 videos/test-video.mp4 --force
bash scripts/p5-verify.sh real-p2
```

Expected behavior: P4 false starts disappear, additional genuine dead space may be removed, and the remaining speech must not sound clipped or robotic.

### Gate B — conservative preservation (`sample-3-large`)

Use the exact source video that created that P2 project:

```bash
bash scripts/p5-run.sh sample-3-large videos/test-video-3.mp4 --plan-only
jq . ~/karve-data/projects/sample-3-large/rough-cut-plan.json
bash scripts/p5-run.sh sample-3-large videos/test-video-3.mp4 --force
bash scripts/p5-verify.sh sample-3-large
```

Expected behavior: emotional narration remains intact; only genuine dead space/P4-approved semantic removal should disappear.

## Manual quality gate

A technical PASS is insufficient. Watch both rough cuts and confirm:

- false starts/retries selected by P4 are actually gone;
- meaningful speech is preserved;
- word beginnings/endings are not clipped;
- normal breathing and expressive pauses are not over-cut;
- audio continuity feels natural;
- A/V sync is intact;
- pacing is clearly better than the source rather than mechanically fast;
- the conservative sample remains conservative.

If the cuts feel too aggressive, tune the versioned P5 thresholds/margins from the real evidence. Do not add another AI layer to solve a deterministic pacing problem.

## P5 acceptance gate

P5 becomes PASS only when:

1. pinned auto-editor `31.5.0` is verified by doctor on the real image;
2. both real representative projects produce inspectable deterministic proposals;
3. P4 + auto-editor merge is reproducible;
4. timeline mapping verifies;
5. both rough-cut MP4s render successfully;
6. A/V sync and artifact-integrity checks pass;
7. manual review accepts cut boundaries, pacing, and preservation;
8. source/transcript/edit-plan remain unchanged.

No P6 implementation begins before this gate.
