---
name: karve
description: Operate and extend the Karve local-first Arabic video pipeline. Use for Karve repository work involving ingest/transcription (P2-P3), Bifrost semantic planning (P4), deterministic rough cuts and timeline mapping (P5), Arabic caption correction and Remotion baseline rendering (P6/P6-B), or bounded Codex + video-talkcraft visual-direction experiments (P6-C). Use when asked to run, debug, validate, review, or productize Karve video processing while preserving accepted artifacts, timing provenance, Arabic caption integrity, and the repo's phase gates.
---

# Karve Video Pipeline

Operate Karve as a **gated, local-first video pipeline**. Treat the repository as the source of truth and this skill as the operating playbook.

## Start every Karve task here

1. Read `AGENTS.md`, `README.md`, `docs/ROADMAP.md`, and `docs/OSS-ADOPTION.md` when present.
2. Read the active phase document before changing code.
3. Inspect the relevant project artifacts under `${KARVE_DATA_ROOT:-~/karve-data}/projects/<project-id>/`.
4. Preserve accepted outputs from prior phases. Build derived artifacts instead of rewriting evidence.
5. Keep the scope bounded to the current gate. Do not implement future phases early.
6. Test before committing. Do not push or merge unless explicitly requested.

If repository instructions disagree with this skill, **repository instructions win**.

For exact artifact contracts and provenance rules, read `references/artifacts-and-contracts.md`.
For the accepted dependency/architecture snapshot, read `references/architecture-baseline.md`.
For P6-C visual-direction work, read `references/p6c-visual-director.md`.
For known failures, read `references/troubleshooting.md`.

## Core architecture rules

- Keep raw video/audio, ASR, rough-cut rendering, and Remotion local.
- Use **Bifrost as the in-pipeline LLM boundary** for Karve AI passes such as P4 and P6-B. Do not add direct Bedrock/provider SDK calls.
- Treat **Codex P6-C as a separate bounded agent runner**, not as a Bifrost provider call and not as the default editor.
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
```

Do not blindly use `--force` in production-like work. Use it deliberately when replacing a derived artifact is intended.

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

## Runbook C — bounded P6-C visual direction

Use P6-C only after the baseline artifacts are accepted.

### Mission shape

- Default to **one 15–30 second segment or one clearly bounded tutorial/explainer section**.
- Split work into two bounded invocations when practical:
  1. **PLAN ONLY** — understand the content and create `visual-plan.json`.
  2. **IMPLEMENT + RENDER** — consume the approved plan, implement only that segment, render, report, and stop.
- Do not let Codex redo ASR, timestamps, semantic planning, rough-cut analysis, or P6-B correction.
- Keep experiment code under `experiments/<project-id>/` until the approach is explicitly promoted.

### Visual reasoning order

For each segment:

1. Understand what the speaker is actually teaching, arguing, demonstrating, or emphasizing.
2. Identify a few semantic beats.
3. Choose the mode: `talking_head`, `technical_explainer`, `tutorial`, or `voiceover_explainer`.
4. Assign **one primary visual job per beat**: `orient`, `explain`, `demonstrate`, `compare`, `prove`, `emphasize`, or `transition`.
5. Decide whether the host is primary, side/bottom/PiP, or temporarily absent.
6. Choose a truthful visual representation.
7. Only then choose a recipe/component.

### video-talkcraft policy

Use the installed `video-talkcraft` Skill as-is for shot design, layout discipline, motion recipes, transitions, visual rhythm, and QA.

- Do not add an MCP layer just to use video-talkcraft with Codex.
- Do not copy the entire recipe/component library into Karve.
- Read only the cards/references needed for the approved plan.
- Prefer existing Karve primitives when they already solve the job.
- If direct reuse is impractical, adapt only the selected recipe into the experiment-local implementation and record the adaptation.
- Create a custom component only when no existing Karve primitive or suitable video-talkcraft recipe can express an important visual job.

### Visual truthfulness and taste

- Never invent product functionality, code behavior, data, UI, chat content, integrations, or technical relationships.
- For technical tutorials/presentations, inspect real code, docs, screenshots, UI, or supplied source material when available.
- If the spoken claim is abstract and evidence is unavailable, use neutral conceptual nodes rather than invented specifics.
- Treat transcript keywords as cues, not automatic animation commands.
- Prefer continuity: transform or expand an existing scene rather than spawning a new card for every sentence.
- Avoid host-layout churn. One yield and one restoration is often better than repeated full/PiP toggling.
- For ordinary webcam footage without alpha, prefer a clean rounded-rectangle PiP over a circular crop when preserving the body/microphone matters.
- Do not duplicate accepted caption emphasis with a second caption animation system.
- Avoid template-like micro-labels unless they materially help comprehension or are grounded in the source language.
- Do not fabricate a demo surface. If the next real screen/video is unavailable, use a restrained handoff cue instead of transitioning into fake UI.

See `references/p6c-visual-director.md` for the plan contract and implementation gate.

## Validation gates

### Baseline P6

At minimum verify:

- TypeScript/Remotion compilation.
- Timeline/presentation logic tests.
- Caption alignment/correction tests when P6-B changed.
- `p6-verify.sh` for the rendered profile.
- Input hash/immutability checks.
- Human visual review.

### P6-C experiment

Before final render:

1. Validate the approved `visual-plan.json` against its contract.
2. Confirm all source/output times map correctly.
3. Confirm accepted caption text/timing are unchanged.
4. Confirm any technical claims have explicit evidence or are neutral abstractions.
5. Run TypeScript checks and ensure the Remotion composition compiles.
6. Prefer low-cost frame/preview validation before a full render.
7. Render one reviewable output.
8. Write `implementation-report.md` with recipes/components used, substitutions, created files, validation results, render specs, and visible limitations.
9. Stop. Do not automatically start a polish loop.

## Change discipline

When modifying Karve:

- Inspect the smallest relevant code/config/test surface first.
- Reuse existing artifacts instead of repeating expensive stages.
- Keep generated/experimental code isolated until accepted.
- Inspect the final diff.
- Report changed files, tests, failures, and remaining risks.
- Finish implementation/testing before Git publication. Do not mix active development with main-branch pushes.
