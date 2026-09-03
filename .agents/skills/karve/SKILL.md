---
name: karve
description: Operate and extend the Karve local-first Arabic video pipeline. Use for Karve repository work involving ingest/transcription (P2-P3), Bifrost semantic planning (P4), deterministic rough cuts and timeline mapping (P5), Arabic caption correction and Remotion baseline rendering (P6/P6-B), and Phase 7 technical visual explainers orchestrated through the karve-videoshot execution skill.
---

# Karve Video Pipeline

Operate Karve as a **gated, local-first video pipeline**. Treat the repository as the source of truth and this skill as the operating playbook.

## Start every Karve task here

1. Read `AGENTS.md`, `README.md`, `docs/ROADMAP.md`, and `docs/OSS-ADOPTION.md` when present.
2. Read the active phase document before changing code. **Current active phase: P7 — Technical Explainers & Visual Director** (architecture/contract gate).
3. Inspect the relevant project artifacts under `${KARVE_DATA_ROOT:-~/karve-data}/projects/<project-id>/`.
4. Preserve accepted outputs from prior phases (P2–P6 are closed as PASS). Build derived artifacts instead of rewriting evidence.
5. Keep the scope bounded to the current gate. Do not implement future phases early.
6. Test before committing. Do not push or merge unless explicitly requested.

If repository instructions disagree with this skill, **repository instructions win**.

For exact artifact contracts and provenance rules, read `references/artifacts-and-contracts.md`.  
For the accepted dependency/architecture snapshot, read `references/architecture-baseline.md`.  
For P7 visual execution architecture, read `references/p7-visual-director.md`.  
For historical P6-C proof-of-concept background, read `references/p6c-visual-director.md`.  
For known failures, read `references/troubleshooting.md`.

## Core architecture rules

- Keep raw video/audio, ASR, rough-cut rendering, and Remotion local.
- Use **Bifrost as the in-pipeline LLM boundary** for Karve AI passes such as P4 and P6-B. Do not add direct Bedrock/provider SDK calls.
- Delegate visual execution for P7 to **`karve-videoshot`** as the bounded Visual Execution Director.
- Keep CPU execution supported; GPU acceleration is optional.
- Keep persistent projects, cache, models, assets, and generated state outside disposable containers.
- Do not add PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and explicit decision.
- Prefer deterministic media code and reusable components over generated behavior.
- Prefer upstream capability in this order: **installed Skill/as-is -> pinned external repo -> thin adapter -> vendor/copy only if a measured gap requires ownership**.
- Arabic is first-class. Preserve RTL shaping, mixed-language readability, caption safe areas, and spoken dialect.

## Pipeline quick reference

Run from the Karve repository root.

```bash
PROJECT="<project-id>"
VIDEO="<path-to-video.mp4>"

# P2 — ingest
bash scripts/p2-run.sh "$VIDEO" --project "$PROJECT" --force

# P3 — local transcription, quality baseline
bash scripts/p3-run.sh "$PROJECT" --language ar --model large-v3 --force

# P4 — structured semantic edit planning through Bifrost
bash scripts/p4-run.sh "$PROJECT" --force

# P5 — deterministic rough cut + source/output timeline mapping
bash scripts/p5-run.sh "$PROJECT" "$VIDEO" --force

# P6-B — sparse display-only ASR correction through Bifrost
bash scripts/p6-correct.sh "$PROJECT" --force

# P6 — baseline presentation/render
bash scripts/p6-run.sh "$PROJECT" --profile source --force
bash scripts/p6-verify.sh "$PROJECT" source

# Other supported profiles
bash scripts/p6-run.sh "$PROJECT" --profile reel --force
bash scripts/p6-verify.sh "$PROJECT" reel
bash scripts/p6-run.sh "$PROJECT" --profile youtube --force
bash scripts/p6-verify.sh "$PROJECT" youtube

# P6 regression logic
bash scripts/p6-logic-test.sh

# P7 — TypeScript & contract validation (runs typecheck + test:p7-contract)
bash scripts/p7-logic-test.sh

# P7 — container runner (runs arbitrary commands in Karve container with .env)
bash scripts/p7-experiment.sh <command>
```

> **Note on P7 CLI Scripts**: Contracts and validators exist in `schemas/p7*` and `src/p7/` (`validate-plan.ts`, `catalog.ts`, `mission.ts`). Standalone CLI wrappers such as `p7-plan.sh`, `p7-run.sh`, and `p7-verify.sh` are currently pending in milestone P7-E/P7-F. Do not invent uncommitted shell scripts.

## Runbook A — prepare a new video

1. Confirm the input exists and is readable.
2. Run P2.
3. Run P3.
4. Inspect `transcript.json` before continuing.
5. Confirm important technical names/terms manually when ASR uncertainty could change meaning.
6. If selecting a visual-direction segment, choose a section with a real explanatory need: process, architecture, comparison, sequence, UI workflow, evidence, code concept, number, or cause/effect.

Do not choose a segment merely because it contains visually attractive keywords.

## Runbook B — generate the accepted baseline

1. Run P4 and inspect the structured semantic plan.
2. Run P5 and inspect `timeline-map.json`.
3. Never assume source time equals output time unless the map proves it.
4. Run P6-B if sparse display correction is needed.
5. Render the target profile with P6.
6. Run the P6 verifier.
7. Perform human review for Arabic readability, pacing, framing, and visible quality. Technical PASS alone is insufficient.

## P6-B correction rules

- Keep `transcript.json` immutable.
- Write corrections to `caption-corrections.json`.
- Correct only clear recognition/boundary errors; preserve dialect, slang, grammar, and spoken wording.
- Reject index/evidence mismatches rather than rewriting evidence.
- Apply corrections to a derived display-word stream before timeline mapping.
- Preserve source provenance for merged/split display words.
- Keep raw P4 visual-intent text immutable; use P6-only `display_text` where an ASR-derived title/callout needs corrected presentation text.
- Maintain metric semantics: `source_words` = raw P3 words, `aligned_words` = corrected display stream, `caption_words` = retained mapped display words, with `aligned_words = caption_words + dropped_words`.

## Runbook C — historical P6-C experiment (Provenance Only)

The P6-C `tech-test-01` experiment proved the viability of plan-first visual delegation. It is now closed and officially succeeded by P7. See `references/p6c-visual-director.md` for historical test provenance.

---

## Runbook D — P7 Visual Execution with `karve-videoshot`

For all active visual explainers, Karve delegates execution to the specialized `karve-videoshot` Skill.

### Production Pipeline
```text
Karve analysis / timing / evidence (P2-P6)
             ↓
P7 visual mission (p7-visual-mission.json)
             ↓
Handoff to `karve-videoshot`
             ↓
Rendered visual segment (Remotion / SVG)
             ↓
Still-first pixel QA / bounded corrections (max 2 passes)
             ↓
Karve final assembly & verification
```

### Ownership Division
- **Karve owns**:
  - Source media, transcript, semantic context
  - Source-to-output timing (`timeline-map.json`)
  - Evidence manifest and factual grounding verification
  - Caption exclusion safe zones ($\ge 160\text{px}$ bottom margin)
  - Visual mission selection and packaging (`p7-visual-mission.json`)
  - Final composition and media multiplexing
- **`karve-videoshot` owns**:
  - Creative Direction (`creative-direction.json`)
  - Storyboard (`storyboard.json`)
  - Visual Specification (`visual-spec.json`)
  - Motion Specification (`motion-spec.json`)
  - Remotion/SVG implementation (`<Explainer>.tsx`)
  - Shot render and dynamic keyframe stills
  - Shot-level visual QA and pixel inspection (`qa-v1.json`)
  - Targeted correction loop (max 2 passes) (`qa-final.json`)
- **`video-talkcraft` & specialist skills**:
  - Supply visual vocabulary, shot patterns, or motion recipes only when queried via Bifrost tools by `karve-videoshot`. They do not act as autonomous project agents.

### Execution Modes
1. **`source_segment` (Production Default)**:
   - Normal Karve production path for bounded 15–30s segments.
   - Timing, rough cuts, audio, and captions remain locked to upstream artifacts.
   - Remotion renders the bounded visual overlay; Karve multiplexes final output.
2. **`standalone_explainer` (Conceptual / Greenfield)**:
   - Used ONLY when explicitly requested to create an independent explainer from scratch without source video.
   - May generate its own narration and internal timeline.
   - Must NOT be mistaken for or substituted into the normal source-video pipeline.

---

## Validation gates

### Baseline P6
At minimum verify:
- TypeScript/Remotion compilation.
- Timeline/presentation logic tests (`bash scripts/p6-logic-test.sh`).
- Caption alignment/correction tests when P6-B changed.
- `p6-verify.sh` for the rendered profile.
- Input hash/immutability checks.
- Human visual review.

### P7 Visual Shots (Compile PASS is NOT sufficient)
Before accepting a P7 visual shot:
1. **TypeScript Build**: Must pass `tsc --noEmit` with zero errors.
2. **Dynamic Keyframe Selection**: Render 6–8 PNG stills chosen dynamically from actual storyboard transition beats (opening, activation, mid-process flow, peak complexity, resolution, comparison, final state).
3. **Actual Pixel Inspection**: Inspect rendered PNG pixels with a vision-capable multimodal evaluator (or human review). Inspecting text descriptions or JSX source code alone is forbidden.
4. **Targeted Correction Loop**: Max 2 remediation passes resolving defects categorized as `SEMANTIC`, `LAYOUT`, `COLLISION`, `MOTION`, `PRECISION`, or `TYPOGRAPHY`.
5. **Final Render**: Re-render affected stills first, then render final MP4.

*(Note: Shot-level visual QA is strictly bounded to the visual shot and is distinct from future P8 system-level review automation).*

---

## Change discipline

When modifying Karve:
- Inspect the smallest relevant code/config/test surface first.
- Reuse existing artifacts instead of repeating expensive stages.
- Keep generated/experimental code isolated in `projects/<id>/p7/` until accepted.
- Inspect the final diff.
- Report changed files, tests, failures, and remaining risks.
- Finish implementation/testing before Git publication. Do not mix active development with main-branch pushes.
