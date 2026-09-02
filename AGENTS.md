# Karve Agent Rules

Karve is intentionally developed through gated phases.

## General rules

1. Do not implement future phases early.
2. Keep the architecture local-first and simple.
3. Prefer deterministic media code and reusable templates over generated behavior.
4. Keep persistent media, caches, models, and generated state outside disposable containers.
5. Do not introduce PostgreSQL, Redis, queues, workers, microservices, or orchestration infrastructure without a measured requirement and explicit decision.
6. Bifrost is the LLM boundary. Do not add direct Bedrock integration unless Bifrost cannot satisfy a documented requirement.
7. Codex CLI may be used only for bounded visual-production tasks after Karve has already established media, timing, transcript, and semantic context. Codex must not become the default editor or redo accepted pipeline stages.
8. CPU execution must remain supported; GPU acceleration is optional.
9. Arabic is a first-class target.
10. Do not install the full media/AI/Remotion toolchain globally on Windows or WSL.
11. Apply **adopt > adapt > build** and check `docs/OSS-ADOPTION.md` before new implementation.
12. Reuse existing Karve artifacts rather than repeating expensive work.
13. Preserve raw inputs and prior-phase JSON; derived presentation text must not silently overwrite ASR or semantic artifacts.
14. Keep verification reproducible through commands in the active phase document.
15. Product quality is separate from technical correctness.
16. Prefer using an installed upstream Skill or pinned external repository as-is before copying its components into Karve. Vendor upstream code only when a measured integration gap requires ownership or modification.

## Phase discipline

Before changing code:

1. read `README.md`, `docs/ROADMAP.md`, and `docs/OSS-ADOPTION.md`;
2. identify and read the active phase document;
3. inspect existing artifacts/contracts;
4. implement only the smallest scope needed for the active gate;
5. validate types, schemas, scripts, and representative real artifacts;
6. inspect the final diff before publishing;
7. report remaining host/quality risks honestly.

## Current phase

Current active phase: **P6 — Arabic captions + standard motion**, with a bounded **P6-C visual-direction experiment** allowed after the accepted P6-B caption baseline.

P0, P1, P2, P3, P4, and P5 are closed as PASS. P6-B sparse caption correction is closed as PASS on real source/reel renders.

### Accepted P3 baseline

- faster-whisper 1.2.1 / CTranslate2 4.8.2;
- Quality/default: `large-v3`, CPU INT8;
- Fast: `turbo`, CPU INT8;
- word timestamps and VAD;
- persistent model cache;
- ASR probabilities are soft evidence, not truth scores;
- WhisperX remains deferred.

### Accepted P4 baseline

- local Bifrost is the only LLM boundary;
- quality/default model: `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`;
- strict JSON Schema output passed on the real route;
- Ajv and Karve semantic validation passed;
- real Arabic edit plans passed manual semantic review;
- raw transcript remains separate from semantic interpretation.

### Accepted P5 baseline

- pinned `auto-editor 31.5.0` v1 timeline;
- Karve deterministic merge with semantic safety margins and keep protection;
- FFmpeg rough-cut renderer;
- source-to-output `timeline-map.json`;
- aggressive `real-p2` and conservative `sample-3-large` real renders passed;
- A/V integrity and human audio/pacing review passed;
- Ubuntu 24.04 container runtime is the accepted baseline.

## P6 goal

Turn verified P5 output into a reusable, profile-driven styled draft with correctly mapped Arabic captions and standard motion.

### P6 adopted dependencies

```text
remotion:                 4.0.520
@remotion/cli:            4.0.520
@remotion/captions:       4.0.520
remotion-captions-kit:    0.2.0
```

Use remotion-captions-kit for headless caption timing/pagination/token state. Karve owns only the thin Arabic RTL, timeline mapping, safe-area, and visual-style layer.

### P6-B bounded AI exception

P6 rendering and presentation planning are deterministic once their input artifacts exist. One optional **P6-B sparse ASR display-correction pass** may call the existing Bifrost boundary before planning/rendering.

That pass must:

- produce a separate validated `caption-corrections.json` artifact;
- correct only clear ASR recognition/boundary errors;
- preserve dialect, slang, grammar, and spoken wording;
- never modify `transcript.json`, P4 semantic artifacts, media cuts, or `timeline-map.json`;
- reject evidence/index inconsistencies rather than rewriting model evidence;
- keep raw P4 intent text immutable while allowing a P6-only `display_text` for ASR-derived title/callout presentation.

No other P6 LLM pass is allowed without an explicit phase decision.

## P6-C — bounded Codex visual-direction experiment

P6-C is a deliberately narrow vertical-slice experiment. Its purpose is to prove that Karve can hand an already understood/timed segment to Codex and obtain a strong visual explanation without importing a motion library into Karve.

### Upstream capability

Use the already installed **`video-talkcraft` Codex Skill** as-is. Do not copy its recipe cards, motion systems, or component library into Karve merely to make them available. No MCP layer is required for this path.

Codex may use the existing Karve Docker/Remotion environment when executing the visual task.

### Invocation budget

Each Codex invocation must have **one bounded mission**. Default to one representative 15–30 second segment or one clearly defined explainer/tutorial section rather than asking Codex to redesign an entire video.

The mission may include planning plus implementation of that one segment, but it must not expand into unrelated cleanup, architecture work, or broad component generation.

### Required inputs

Prefer existing Karve artifacts over regenerated analysis:

```text
rough-cut.mp4
transcript.json
timeline-map.json
p6-<profile>.plan.json
caption-corrections.json   # when present
edit-plan.json / carried visual intents when useful
project/source material    # only when needed to explain technical facts correctly
```

For technical tutorials or presentations, Codex must inspect the relevant real code, docs, screenshots, UI, or other supplied source material when those materials are available. Do not invent a fake technical explanation or mock a real interface when the real source can be used.

### Visual-director workflow

Within the bounded mission Codex must work in this order:

1. **Understand the segment before choosing effects.** Read the transcript segment plus enough neighboring context to understand what is being taught, argued, demonstrated, or emphasized.
2. **Identify the teaching/communication goal.** Extract the few important ideas, entities, claims, steps, numbers, contrasts, or code concepts that genuinely need a visual counterpart.
3. **Choose the visual mode.** Use one of:
   - `talking_head` — host remains the relationship anchor; cards/callouts/evidence periodically take focus;
   - `technical_explainer` — diagrams, code, screenshots, comparisons, or evidence can become primary while the host moves aside or into a chip;
   - `tutorial` — real screen/code/UI steps are primary and visuals should teach sequence/action;
   - `voiceover_explainer` — visuals carry the explanation when no host needs to remain primary.
4. **Create the visual plan before implementation.** Produce a compact `visual-plan.json` (or equivalent structured artifact) for the scoped segment.
5. **Select visual jobs before recipes.** Each semantic beat gets one primary visual job such as `orient`, `explain`, `demonstrate`, `compare`, `prove`, `emphasize`, or `transition`. Only then choose a `video-talkcraft` recipe/card or reusable Karve primitive that serves that job.
6. **Use the installed `video-talkcraft` Skill.** Follow its shot-design, layout-budget, motion-recipe, timing, and QA guidance. Reuse its recipes rather than recreating them from memory.
7. **Implement only the planned segment.** Use Docker/Remotion and existing Karve timing/caption artifacts. Render a reviewable result for that mission.
8. **Stop after the bounded result.** Report the plan, recipes/components used, generated files, render/verification result, and any concrete gap that prevented reuse.

### Minimum visual-plan contract

The plan should stay compact and implementation-oriented. At minimum record:

```text
mode
overall_teaching_goal
key_points[]
beats[]:
  source_start / source_end
  message
  visual_job
  why_visual_needed
  host_layout
  recipe_or_component
  timing_anchor
  required_asset_or_evidence
```

A recipe/component must never be selected only because it looks impressive. `why_visual_needed` should explain what comprehension, evidence, orientation, or emphasis it adds.

### Visual explanation rules

- Think in **semantic beats**, not one new component per sentence.
- One beat has one primary visual job and one primary focus.
- Prefer continuity: an existing element may transform, move, highlight, or yield instead of introducing another card.
- Use the host deliberately: full/primary when human connection matters; side/bottom/chip when evidence or explanation needs the stage; hidden only when the visual itself should carry the point.
- For a technical concept, prefer the most truthful visual representation available: real code, real UI, real screenshot, real data, a diagram derived from the concept, or a concise comparison. Decorative cards are secondary.
- Important words in the transcript are cues, not automatic animation commands. Animate only when the word marks a meaningful semantic beat.
- Preserve Karve caption text/timing and accepted cuts. Visual work must sit on top of them, not regenerate them.
- Do not re-run ASR, timestamp alignment, rough-cut analysis, P6-B caption correction, or P4 semantic planning.
- Do not modify accepted P3/P4/P5/P6-B artifacts.
- Do not vendor `video-talkcraft` source into Karve during the experiment.
- A new custom component is allowed only when no existing Karve primitive or suitable `video-talkcraft` recipe can express an important visual job, and the mission explicitly needs it.

### P6-C output isolation

Until the experiment is accepted, Codex-generated visual code and renders must stay in an isolated experiment/generated area rather than silently becoming the canonical P6 renderer. The experiment may read accepted artifacts but must not mutate them.

The production `explainer` intent remains deferred to P7. P6-C may read explainer cues to test visual-direction quality, but it does not redefine the accepted P6 contract yet.

### P6 may include

- versioned source/reel/YouTube profiles;
- source-to-output word and intent mapping;
- Arabic RTL and mixed-language captions;
- active-word and `caption_emphasis` rendering;
- sparse P6-B display-only ASR correction through Bifrost;
- P4-driven punch-ins;
- P4-driven title/callout cards;
- deterministic Remotion render invocation;
- plan schema, artifact hashes, and render verification;
- restrained reusable style configuration;
- isolated, bounded P6-C Codex/video-talkcraft visual-direction experiments that do not mutate accepted P6 artifacts.

### P6 must not include

- new semantic edit planning in the canonical P6 pipeline;
- any canonical P6 LLM pass beyond the bounded P6-B ASR display-correction pass;
- unbounded Codex redesign of a whole project;
- bulk copying/vendorizing of `video-talkcraft` components;
- database/queue infrastructure;
- changes to raw P3/P4/P5 or accepted P6-B artifacts.

`explainer` intent remains explicitly deferred to P7 production behavior.

## P6 quality direction

- Correct Arabic shaping, order, and mixed-language readability are mandatory.
- Captions must follow mapped speech timing and stay inside safe areas.
- P4 emphasis and punch-ins must appear at mapped P5 output times.
- ASR-derived title/callout display text must stay consistent with accepted P6-B corrections.
- Do not add extra zooms or cards beyond validated intent in the canonical P6 renderer.
- At most one title/callout card should display at once.
- Reel/YouTube profiles should contain the subject rather than blindly crop.
- Technical PASS does not close P6 without human visual review.

## Definition of done

P6 is done only when the pinned Remotion environment builds, type/mapping tests pass, representative source/reel renders verify, Arabic visual quality passes manual review, input hashes remain unchanged, a resolved dependency lockfile is captured, and the result is visibly closer to publishable output.

P6-C is successful only when a bounded real segment demonstrates that Codex can consume existing Karve artifacts, use the installed `video-talkcraft` Skill, plan visual explanations before implementation, render through the existing Docker/Remotion environment, and produce a result that is materially more explanatory/polished without redoing prior pipeline stages.
