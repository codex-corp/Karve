# P6 — Arabic Captions & Standard Motion

## Status

**PASS — CLOSED**

P6 is the accepted styled-draft baseline. It turns verified P5 output into profile-driven Remotion renders with mapped Arabic captions, sparse display-only ASR correction, standard reusable motion, deterministic verification, and reproducible dependency locking.

Technical explainers, generated diagrams/code/UI visuals, and production Codex visual direction are P7 responsibilities.

---

## Accepted inputs and outputs

Given a P5 project containing:

```text
source.json
transcript.json
rough-cut-plan.json
timeline-map.json
rough-cut.mp4
```

P6 may also consume:

```text
caption-corrections.json   # optional P6-B display-only artifact
```

P6 produces:

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

---

## Accepted OSS stack

```text
remotion:                 4.0.520
@remotion/cli:            4.0.520
@remotion/captions:       4.0.520
remotion-captions-kit:    0.2.0
```

Remotion is the compositor/renderer. `remotion-captions-kit` contributes headless timing/pagination/token-state primitives; Karve owns the Arabic RTL, timeline, safe-area, style, and verification layer.

The resolved dependency graph is committed in `package-lock.json`; the container can use `npm ci` for reproducible installation.

Remotion remains subject to its own source-available license. Re-check current terms before commercial deployment/distribution.

---

## P6-B — sparse ASR display correction

P6-B is one optional bounded pre-render correction layer for clear ASR recognition/boundary errors. It calls the existing Bifrost boundary and quality model, but it is not a second semantic editor.

Accepted rules:

1. `transcript.json` remains immutable raw ASR ground truth.
2. Correct only clear recognition/boundary errors; preserve dialect, slang, grammar, and spoken wording.
3. Persist a separate schema-validated `caption-corrections.json`.
4. `original_text` must exactly match the referenced raw transcript range; reject inconsistent evidence rather than repairing it.
5. Dry-validate through the same `applyCorrections()` structural invariants used during consumption.
6. Support 1:1, N:1, 1:N, and N:M replacement mappings.
7. Keep complete raw provenance on display tokens.
8. Keep raw P4 intent `text` immutable; an ASR-derived title/callout may receive presentation-only `display_text` only when the corrected phrase matches the same source-time evidence.
9. Once `caption-corrections.json` exists, P6 presentation planning and rendering are deterministic.

Accepted metrics distinguish:

```text
source_words   raw P3 ASR count
aligned_words  display-word count after P6-B structural correction
caption_words  aligned words retained after P5 timeline mapping
```

For `sample-3-large`, accepted N:1 corrections turn 55 raw words into 53 aligned display words.

---

## Deterministic word flow

```text
raw transcript
    -> applyCorrections()
    -> aligned display stream
    -> mapAlignedWords(timeline-map)
    -> P6 caption words
    -> Remotion
```

Never map raw words and then apply structural correction afterward; N:1 / 1:N / N:M corrections must be resolved before output-time mapping.

---

## Timeline mapping

P3 words and P4 visual intents use original source timestamps. P6 translates them through P5 `timeline-map.json`.

Accepted rules:

1. Raw P3 words pass through optional P6-B structural correction before timeline mapping.
2. Words whose midpoint remains in a kept P5 segment map to the corresponding output segment.
3. A fully removed word is dropped from display.
4. A word touching a cut boundary is trimmed to the retained range and recorded through diagnostics.
5. A visual intent crossing a removed range becomes one continuous output intent; `source_parts` records contributing kept fragments.
6. Fully removed intents are dropped.
7. `explainer` intents are retained as deferred P7 input rather than rendered by canonical P6.
8. Raw ASR and P4 text are never silently rewritten.

---

## Presentation plan

`schemas/p6-presentation-plan.schema.json` validates the versioned plan.

The plan records:

- canvas dimensions, FPS, and duration frames;
- source and P5 output durations;
- layout/profile/style selection;
- mapped caption/display words with raw provenance and source/output timestamps;
- source/aligned/caption metrics;
- mapped standard visual intents;
- optional corrected display text for ASR-derived cards;
- deferred explainers;
- caption and motion style values;
- dropped/trimmed/split diagnostics;
- input hashes.

P6 verification rebuilds the plan deterministically and requires equality with the saved artifact.

---

## Visual behavior

### Arabic captions

The accepted renderer:

- sets `dir`, CSS `direction`, and `unicode-bidi` explicitly;
- isolates tokens for mixed Arabic/English technical text;
- uses stable glyph metrics so highlighting does not reflow lines;
- highlights the active spoken word;
- applies stronger emphasis inside P4 `caption_emphasis` ranges;
- paginates using duration, silence, character, punctuation, and orphan limits;
- keeps caption values profile-specific and versioned.

`linger_ms` provides a small bounded silence buffer without changing accepted word timing.

### Punch-ins

P4 `punch_in` intents become smooth bounded scale animation. P6 does not invent additional zooms.

### Titles and callouts

P4 `title` and `callout` intents render as reusable RTL-aware cards with collision control. P6-B may add presentation-only corrected `display_text` while preserving original P4 `text` for auditability.

### Reel and YouTube layouts

Non-native profiles use a contained foreground over a blurred/muted duplicate background instead of blindly cropping the talking head. Only the foreground contributes audio.

---

## Style profile

Accepted style:

```text
karve-clean-v1
```

It intentionally uses restrained motion, one accent system, selective zooms, and limited cards. Style values live in `config/p6-profiles.json`; the LLM does not improvise CSS/animation on every render.

---

## AI boundary

P6 has one allowed optional AI pass: P6-B sparse ASR display correction through Bifrost.

It may not change:

- cuts;
- semantic decisions;
- P4 artifacts;
- raw transcript evidence;
- timeline mapping.

Once the correction artifact exists, P6 planning/rendering remain deterministic.

Canonical P6 does not invoke Codex to generate one-off components. Production visual explainers are P7.

---

## Rendering / acceleration boundary

Accepted runtime behavior:

- CPU correctness is mandatory;
- FFmpeg CPU `libx264` remains the supported baseline where it is already fast enough;
- hardware video encoding is not required for P6 correctness;
- Chromium/Remotion hardware acceleration may be used when available through the WSL graphics path;
- GPU acceleration is an optimization, never a correctness dependency.

---

## Commands

### Logic/regression tests

```bash
bash scripts/bootstrap.sh
bash scripts/p6-logic-test.sh
```

### Sparse display correction

```bash
bash scripts/p6-correct.sh <project> --force
```

### Plan/render/verify source

```bash
bash scripts/p6-run.sh <project> --profile source --plan-only
bash scripts/p6-run.sh <project> --profile source --force
bash scripts/p6-verify.sh <project> source
```

### Reel

```bash
bash scripts/p6-run.sh <project> --profile reel --force
bash scripts/p6-verify.sh <project> reel
```

---

## Automated verification

`p6-logic-test.sh` covers:

- TypeScript types for orchestration and Remotion components;
- source-to-output timestamp mapping;
- cut-boundary word handling;
- cut-crossing intent continuity;
- Arabic punctuation compatibility;
- source/reel profile behavior;
- structural P6-B alignment;
- provenance and source/aligned/caption metrics;
- title/callout display consistency.

`p6-verify.sh` covers:

- presentation-plan JSON Schema;
- exact deterministic plan rebuild;
- mapped word/intent bounds;
- unique display indexes and raw provenance ranges;
- word metrics;
- profile/caption metrics;
- input hashes;
- output hash and media metadata;
- H.264/AAC streams;
- dimensions, FPS, and duration.

---

## Manual quality acceptance

P6 was closed only after manual review confirmed representative outputs for:

- correct Arabic glyph shaping and word order;
- mixed Arabic/English readability;
- active-word timing;
- stable caption page rhythm;
- safe areas;
- P6-B corrected display consistency;
- immutable raw P4 semantic text;
- restrained punch-ins/callouts;
- reel reframing without awkward subject crop;
- audio sync/equivalence to P5;
- visibly intentional styled output rather than generic over-editing.

Representative `sample-3-large` source/reel and aggressive-cut `real-p2` paths passed the accepted verification gate.

---

## P6-C proof-of-concept record

After the canonical P6/P6-B baseline was accepted, P6-C ran a deliberately isolated visual-direction experiment on `tech-test-01`.

It proved:

```text
accepted Karve artifacts
    -> bounded Codex mission
    -> installed video-talkcraft Skill
    -> PLAN ONLY
    -> reviewed/grounded visual plan
    -> separate IMPLEMENT + RENDER mission
    -> Remotion result
```

Revision 2 removed unsupported technical claims, used neutral grounded ecosystem labels, replaced an awkward circular host crop with native-aspect rounded PiP, cleaned template-like labels, and preserved canonical P6 captions/timing.

P6-C therefore closed as a successful proof of concept, but its generated experiment code was not promoted into the canonical P6 renderer. The architecture is promoted into P7.

See `docs/P7-TECHNICAL-EXPLAINERS.md`.

---

## Closure record

P6 is **CLOSED PASS** because:

1. the pinned Remotion environment and dependency lock are reproducible;
2. type/mapping/correction/provenance tests pass;
3. representative source/reel renders verify;
4. the aggressive P5-cut case verifies;
5. Arabic timing/order/safe areas passed manual review;
6. P6-B correction consistency passed on real renders;
7. input artifacts remain immutable;
8. deterministic hashes/media verification pass;
9. the styled draft is materially closer to publishable output;
10. the bounded P6-C proof established the safe promotion path for P7 technical visual direction.
