# P6-C visual director

## Goal

Prove that Karve can hand an already understood/timed segment to Codex and receive a strong visual explanation without turning Codex into the editor of record or vendoring the full video-talkcraft library.

## Inputs

Prefer existing artifacts:

```text
rough-cut.mp4
transcript.json
edit-plan.json
timeline-map.json
caption-corrections.json     # if present
p6-<profile>.plan.json
real code/docs/screens/UI     # when technical truth depends on them
```

Use `rough-cut.mp4` or the underlying media layer as host footage when the host needs to resize/reposition. Do not flatten accepted captions into the host layer if that would make captions move/scale with the host.

## Stage 1 — plan only

Ask Codex to:

1. read `AGENTS.md` and the relevant project artifacts;
2. use the installed `video-talkcraft` Skill;
3. understand the selected segment plus enough neighboring context;
4. identify the teaching goal and semantic beats;
5. choose the visual mode;
6. assign one visual job per beat;
7. choose host layout and truthful visual representation;
8. select existing recipes/components only after the visual job is clear;
9. create `experiments/<project-id>/visual-plan.json`;
10. stop without coding or rendering.

Reject or revise a plan when it:

- invents technical/product details;
- maps one flashy component to every sentence;
- chooses recipes without an explanatory reason;
- repeats full/PiP/full/PiP layout churn;
- changes accepted captions/cuts;
- leaves the actual explanatory component unspecified;
- requires fake UI or fake evidence.

## Stage 2 — implement and render

After plan approval, ask Codex to:

1. treat `visual-plan.json` as the source of truth;
2. read only required video-talkcraft cards/references;
3. reuse canonical Karve primitives first;
4. adapt only the selected upstream recipe when direct reuse is impractical;
5. keep experiment code under `experiments/<project-id>/`;
6. preserve accepted caption text/timing and prior phase artifacts;
7. run type/build checks;
8. use low-cost frame/preview checks where practical;
9. render `p6c-visual-<profile>.mp4`;
10. write `implementation-report.md`;
11. stop without commit/push or an automatic redesign loop.

## Host strategy

Use the host as a communication tool, not a fixed template.

- Keep host primary for personal statements, trust/relationship moments, opinion, expectation, and direct invitation.
- Yield the stage when a diagram, screenshot, code, UI, comparison, or evidence is doing the teaching.
- Keep the host side/bottom/PiP when human presence still helps but the visual needs space.
- Hide the host only when the visual itself should fully carry the point.
- Prefer a single continuous layout event across connected beats.

For standard webcam footage without subject alpha, a 16:9 rounded-rectangle PiP often preserves framing better than a circular crop.

## Semantic truthfulness

Visual meaning must be grounded in one of:

1. spoken transcript;
2. accepted semantic plan;
3. real code/docs/UI/screenshots/data supplied or inspected for the task.

If the source says only "a bigger ecosystem," do not invent named features such as agents, API/Webhooks, or automations unless supporting evidence is available. Use neutral categories or unlabeled conceptual nodes.

## Visual continuity

Prefer:

```text
existing scene
  -> transform/expand/highlight
  -> next semantic state
```

over:

```text
sentence -> new card
sentence -> new card
sentence -> new card
```

A relationship diagram can expand into an ecosystem view; a code card can highlight a line instead of being replaced; a host can yield once and restore once.

## Captions

- Keep accepted Arabic caption text/timing/style unless the task explicitly targets the canonical caption system.
- Keep captions in a top-level stable layer when moving/resizing host footage.
- Do not apply video-talkcraft caption effects on top of an already accepted Karve caption emphasis unless explicitly requested.
- Keep visual overlays clear of caption and face safe zones.

## Asset rules

- Use verified logos/icons when available and permitted.
- If a verified brand asset is unavailable, prefer a neutral text-labelled badge over a fake logo.
- Do not create fake product screens.
- A conceptual diagram may show the relationship asserted by the source without pretending to be a screenshot.

## Quality gate

Judge the result by whether the viewer understands the meaning faster or more clearly, not by effect count.

Check:

- technical/semantic correctness;
- explanatory value;
- host/layout decisions;
- motion taste and continuity;
- caption/safe-area integrity;
- absence of unsupported claims;
- absence of unnecessary effects;
- visible polish at target viewing size.
