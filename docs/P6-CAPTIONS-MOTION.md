# P6 — Arabic Captions & Standard Motion

## Status

**ACTIVE — CAPTION/ASR QUALITY BASELINE IMPLEMENTED; BROADER VISUAL QUALITY GATE OPEN**

P0-P5 are closed as PASS. P6 is the first major visual-quality milestone: it turns a verified P5 rough cut into a styled draft with mapped Arabic captions, active-word highlighting, selective punch-ins, titles, and callouts.

P6 does not generate technical diagrams, code cards, custom explainers, or one-off motion components. Those remain P7 responsibilities.

## Goal

Given a P5 project containing:

```text
source.json
transcript.json
rough-cut-plan.json
timeline-map.json
rough-cut.mp4
```

P6 may also consume the optional display-only artifact:

```text
caption-corrections.json
```

P6 produces profile-specific artifacts:

```text
p6-<profile>.plan.json
p6-<profile>.mp4
p6-<profile>.meta.json
```

Supported profiles:

```text
source    preserve P5 dimensions and FPS
reel      1080x1920 with contained foreground and blurred background
youtube   1920x1080 with contained foreground and blurred background
```

## OSS-first decisions

### Remotion

Karve pins the Remotion family to:

```text
remotion:             4.0.520
@remotion/cli:        4.0.520
@remotion/captions:   4.0.520
```

Remotion is the programmatic compositor and renderer. Karve uses its official CLI, JSON props, `--public-dir`, explicit dimensions/FPS/duration, the configured Chrome executable, and `OffthreadVideo` for the existing P5 media.

Remotion is source-available under its own license rather than a standard MIT/Apache license. The existing license caveat remains authoritative: commercial use must be checked against the current Remotion terms before deployment or distribution.

### remotion-captions-kit

Karve pins:

```text
remotion-captions-kit: 0.2.0
license: MIT
```

Karve reuses the solved headless primitives instead of rebuilding caption timing and pagination:

- `captionsFromWords()`;
- `createCaptionPages()`;
- `CaptionTrack`;
- `useTokenStates()`.

Karve supplies only the project-specific compatibility/presentation layer:

- Arabic RTL direction and Unicode bidi isolation;
- Noto Sans Arabic typography;
- source-time to rough-cut-time mapping;
- Arabic punctuation normalization for pagination, while restoring the original displayed tokens;
- Karve style, safe-area placement, and active-word emphasis.

The library's visual presets are not adopted wholesale because Arabic/RTL behavior must be judged on real output and Karve needs a restrained, consistent style rather than a generic social-video preset.

## Dependency isolation

P6 does not install Node, Remotion, React, or caption packages on Windows or globally in WSL.

Exact direct versions are declared in `package.json` and installed during Docker image build at:

```text
/workspace/node_modules
```

The repository is mounted at `/workspace/karve`, so the bind mount does not hide the image-owned dependencies. Runtime assets and outputs remain under `~/karve-data`.

A committed resolved lockfile is still a reproducibility follow-up. Direct dependencies are exact pins. The first P6 image build may bootstrap with `npm install`; `scripts/p6-capture-lock.sh` then copies the image-resolved lockfile into the repository for review. The Dockerfile automatically switches to `npm ci` on subsequent builds once that lockfile exists.

## P6-B — sparse ASR display correction

P6-B is one bounded optional pre-render correction layer for clear ASR recognition errors. It calls the existing Bifrost boundary and quality model, but it is not a second semantic editor.

Rules:

1. `transcript.json` remains immutable raw ASR ground truth.
2. Only clear recognition/boundary errors are eligible; dialect, slang, grammar, and spoken wording must be preserved.
3. Output is a separate schema-validated `caption-corrections.json` artifact.
4. Model `original_text` must exactly match the referenced raw transcript range; Karve rejects inconsistent evidence instead of repairing it.
5. The generated artifact is dry-validated through the same `applyCorrections()` structural invariants used by P6 consumption, catching overlaps, inverted ranges, and invalid spans before persistence.
6. Structural replacement supports 1:1, N:1, 1:N, and N:M mappings.
7. Every display token keeps complete raw provenance: `display_word_index`, `source_word_start`, `source_word_end`, and `raw_text`.
8. Raw P4 intent `text` remains immutable. When an ASR-derived `title` or `callout` contains the exact corrected phrase in the same source-time range, P6 may add an explicit presentation-only `display_text`.
9. Once `caption-corrections.json` exists, P6 presentation planning and rendering remain deterministic.

For `sample-3-large`, the current accepted correction set turns 55 raw ASR words into 53 aligned display words because two corrections are N:1 merges. Metrics therefore distinguish:

```text
source_words   raw P3 ASR count
aligned_words  display-word count after P6-B structural correction
caption_words  aligned words retained after P5 timeline mapping
```

## Timeline mapping

P3 words and P4 visual intents use original source timestamps. P6 translates every one through P5 `timeline-map.json` before rendering.

Rules:

1. Raw P3 words pass through the optional P6-B structural correction stream before timeline mapping.
2. Words whose midpoint remains in a kept P5 segment map to the corresponding output segment.
3. A word fully removed by P5 is dropped from display.
4. A word touching a cut boundary is trimmed to the retained media range and recorded through `retained_fraction` and `trimmed_by_cut` diagnostics.
5. A visual intent that crosses a removed range becomes one continuous output intent; `source_parts` records how many kept source fragments contributed. This avoids restarting a zoom/card exactly on a jump cut.
6. Intents fully removed by P5 are dropped.
7. `explainer` intents are preserved in `deferred_visual_intents` for P7 and are not rendered in P6.
8. Raw ASR and P4 text are never silently rewritten; P6 uses explicit raw/display presentation fields.

For `sample-3-large`, the accepted source punch-in `23.79s -> 24.97s` maps to `22.51s -> 23.69s` after the 1.28-second P5 cut.

## Presentation plan

`schemas/p6-presentation-plan.schema.json` validates the versioned plan.

The plan records:

- canvas dimensions, FPS, and duration in frames;
- source and P5 output durations;
- layout/profile/style selection;
- mapped caption/display words with raw ASR provenance, probability, and source/output timestamps;
- raw/aligned/rendered word metrics;
- mapped standard visual intents, including optional corrected display text for ASR-derived cards;
- deferred explainers;
- caption and motion style values;
- dropped/trimmed/split diagnostics.

P6 verification rebuilds the plan deterministically and requires it to match the saved artifact exactly.

## Visual behavior

### Arabic captions

The default renderer:

- sets `dir`, CSS `direction`, and `unicode-bidi` explicitly;
- isolates each token for mixed Arabic/English technical text;
- uses stable glyph metrics so highlighting does not reflow the line;
- highlights the active spoken word;
- applies stronger emphasis within P4 `caption_emphasis` ranges;
- paginates using duration, silence, character, punctuation, and orphan limits;
- keeps caption settings profile-specific and versioned.

The `source` profile derives caption font size from canvas height with minimum/maximum bounds, so both 360p test media and larger source video remain readable.

### Punch-ins

P4 `punch_in` intents become smooth bounded scale animation. P6 does not invent additional zooms. The scale is selected from `subtle`, `normal`, or `strong` values in the style profile.

### Titles and callouts

P4 `title` and `callout` intents render as reusable top-area RTL-aware cards. At most one card is shown at a time to avoid collisions. Multi-line text is supported.

If P6-B has an exact sparse correction for ASR-derived card text in the same source-time range, Remotion renders `display_text`; the original P4 `text` remains preserved in the presentation plan for auditability.

### Reel and YouTube layouts

Non-native profiles use a contained foreground over a blurred muted duplicate background rather than blindly cropping the talking head. Only the foreground video contributes audio.

## Style profile

The first versioned style is:

```text
karve-clean-v1
```

It intentionally uses restrained motion, one accent color, selective zooms, and limited cards. Style values live in `config/p6-profiles.json`; the LLM does not improvise CSS or animation on every render.

## AI boundary

P6 has exactly one allowed optional AI exception: the P6-B sparse ASR display-correction pass through Bifrost. It may not change cuts, semantic decisions, P4 artifacts, or raw transcript data. Once the correction artifact exists, P6 presentation planning and rendering are deterministic. Codex CLI is not used to generate components in P6. Missing custom explainer components remain P7 work.

## Commands

Rebuild once because P6 adds the pinned Remotion stack:

```bash
git pull --ff-only
bash scripts/bootstrap.sh
bash scripts/p6-logic-test.sh
```

After the first successful build, capture the resolved dependency graph for review:

```bash
bash scripts/p6-capture-lock.sh
```

### Generate sparse display corrections when needed

```bash
bash scripts/p6-correct.sh sample-3-large --force
jq . ~/karve-data/projects/sample-3-large/caption-corrections.json
```

### Inspect the mapped plan

```bash
bash scripts/p6-run.sh sample-3-large --profile source --plan-only
jq . ~/karve-data/projects/sample-3-large/p6-source.plan.json
```

### Render the source-size visual gate

```bash
git pull --ff-only
bash scripts/p6-run.sh sample-3-large --profile source --force
bash scripts/p6-verify.sh sample-3-large source
```

Output:

```text
~/karve-data/projects/sample-3-large/p6-source.mp4
```

### Render the reel profile

```bash
bash scripts/p6-run.sh sample-3-large --profile reel --force
bash scripts/p6-verify.sh sample-3-large reel
```

Output:

```text
~/karve-data/projects/sample-3-large/p6-reel.mp4
```

After the conservative sample, run the aggressive-cut sample to verify caption remapping across multiple removed regions:

```bash
bash scripts/p6-run.sh real-p2 --profile source --force
bash scripts/p6-verify.sh real-p2 source
```

## Automated verification

`p6-logic-test.sh` runs inside the container and checks:

- TypeScript types for orchestration and Remotion components;
- source-to-output timestamp mapping;
- cut-boundary word handling;
- cut-crossing intent continuity and time shifting;
- Arabic punctuation compatibility;
- source/reel profile resolution;
- structural P6-B correction alignment;
- P6-B.2 provenance, raw/aligned/caption metrics, and title/callout display consistency.

`p6-verify.sh` checks:

- presentation-plan JSON Schema;
- exact deterministic plan rebuild;
- mapped words and visual intents against output duration;
- unique display-word indexes and valid raw-source provenance ranges;
- raw/aligned/caption word metrics;
- profile and caption metrics;
- input artifact hashes;
- output hash and metadata;
- H.264/AAC streams;
- dimensions, FPS, and duration.

## Manual visual-quality gate

Automated PASS is insufficient. Watch `source` and `reel` drafts and confirm:

- Arabic glyph shaping and word order are correct;
- mixed Arabic/English terms stay readable;
- active-word highlighting follows speech;
- pages do not flash, overflow, or create distracting one-word fragments;
- captions do not cover the speaker's face or important content;
- accepted P6-B corrections appear consistently in captions and ASR-derived title/callout cards;
- P4 raw semantic text remains unchanged;
- `شعور لا يوصف` receives emphasis at the correct mapped time;
- the callout appears at the correct time and its display text is consistent with accepted ASR corrections;
- `اشتقنا لكم` receives a restrained punch-in at the mapped time;
- reel reframing preserves the talking head without awkward cropping;
- audio content and sync remain equivalent to the P5 rough cut;
- the result feels intentional, not generic or over-edited.

## P6 acceptance gate

P6 becomes PASS only when:

1. bootstrap/doctor passes with the pinned Remotion stack;
2. P6 type, mapping, correction, and provenance tests pass;
3. `sample-3-large` source and reel profiles render and verify;
4. `real-p2` source profile renders and verifies across aggressive P5 cuts;
5. Arabic RTL order, shaping, timing, safe areas, and page rhythm pass manual review;
6. punch-ins/callouts are relevant and conservative;
7. accepted P6-B corrections stay consistent across captions and ASR-derived card text;
8. input artifacts remain unchanged;
9. the styled draft is visibly closer to publishable output;
10. a resolved dependency lockfile is captured before P6 is considered reproducibly closed.

No P7 implementation begins before this gate.

## Development-side verification before publication

The P6 baseline has been checked with:

- JSON and shell syntax validation;
- TypeScript/TSX type checking on the target container in previous P6 gates;
- pure timeline/presentation regression tests;
- structural P6-B alignment tests including 2:1, 1:2, and 2:3 mappings;
- real `sample-3-large` transcript, P5 plan, timeline map, and rough-cut media;
- real source and reel Remotion renders through P6-B.1;
- exact punch-in shift from `23.79s` to `22.51s`;
- source profile resolution to `640x360 @ 23.976024fps` with adaptive captions;
- reel profile resolution to `1080x1920`;
- plan JSON Schema validation;
- verifier hash and media checks.

P6-B.2 adds deterministic tests for display-card correction consistency, raw-source provenance, and raw/aligned/rendered word metrics. A new target-host source/reel rerender is required after this code change before treating that visual consistency fix as host-verified.
