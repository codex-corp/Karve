# Karve artifacts and contracts

## Project artifact map

Typical project root:

```text
${KARVE_DATA_ROOT}/projects/<project-id>/
├── source.json
├── audio.wav
├── transcript.json
├── edit-plan.json
├── rough-cut-plan.json
├── timeline-map.json
├── rough-cut.meta.json
├── rough-cut.mp4
├── caption-corrections.json        # optional P6-B
├── p6-source.plan.json             # profile-specific
├── p6-source.mp4
├── p6-reel.plan.json
├── p6-reel.mp4
└── ...
```

Do not require every optional artifact for every task; inspect the active phase.

## Evidence versus accepted derived artifacts

Distinguish provenance correctly:

- `source.json`, source media, and `transcript.json` are source/ASR evidence.
- `edit-plan.json`, rough-cut artifacts, `timeline-map.json`, correction artifacts, and P6 plans are derived outputs.
- Once a prior phase is accepted, treat its artifacts as immutable inputs to later phases unless the user explicitly reruns that phase.

Do not call every prior-phase artifact "raw".

## P3 -> P6 display-word flow

Use this conceptual flow:

```text
raw transcript words
      ↓
applyCorrections(caption-corrections.json)
      ↓
aligned display-word stream
      ↓
mapAlignedWords(timeline-map.json)
      ↓
output-time caption words
      ↓
Remotion captions
```

`timeline-map.json` is an input to mapping, not the output of `mapAlignedWords()`.

### Sparse correction provenance

Support 1:1, N:1, 1:N, and N:M replacement ranges.

For derived display words, preserve enough provenance to identify the contributing raw word range, including `source_word_start` and `source_word_end` where the current schema provides them. Multiple display words may share a raw range after 1:N/N:M alignment; use display-word identity for uniqueness.

Metric semantics:

```text
source_words  = raw P3 word count
aligned_words = display words after structural correction
caption_words = display words retained after timeline mapping
dropped_words = aligned_words - caption_words
```

## Timeline mapping

Never assume source and output times are 1:1.

For every bounded visual segment:

1. identify `source_start`/`source_end` from transcript/semantic evidence;
2. map through `timeline-map.json`;
3. record both source and output times in the visual plan;
4. if a source span intersects a removed range, decide explicitly whether to split/drop the visual beat.

If P5 made no cuts, record that 1:1 mapping was verified rather than assumed.

## P6-C visual-plan minimum contract

Prefer a structured JSON plan similar to:

```json
{
  "version": 1,
  "project_id": "tech-test-01",
  "profile": "source",
  "segment": {
    "source_start": 12.82,
    "source_end": 31.92,
    "output_start": 12.82,
    "output_end": 31.92
  },
  "mode": "technical_explainer",
  "narrative_arc": "personal_discovery",
  "overall_teaching_goal": "...",
  "key_points": ["..."],
  "host_strategy": {"default": "..."},
  "asset_policy": {"allowed": "...", "prohibited": "..."},
  "beats": [
    {
      "id": "feature-announcement",
      "source_start": 12.82,
      "source_end": 19.4,
      "output_start": 12.82,
      "output_end": 19.4,
      "message": "...",
      "visual_job": "explain",
      "why_visual_needed": "...",
      "host_layout": "...",
      "recipe_or_component": ["..."],
      "timing_anchor": "...",
      "required_asset_or_evidence": ["..."],
      "display_text": "...",
      "supporting_entities": ["..."],
      "fallback": "..."
    }
  ]
}
```

Use enum-like values for `mode` and `visual_job`; keep descriptive fields for rationale/layout.

## Immutability checklist

A later phase must not silently rewrite:

- source media;
- `transcript.json`;
- accepted P4 semantic evidence;
- accepted P5 cut/timeline artifacts;
- accepted P6-B correction artifact.

Display-only correction or visual direction belongs in new derived artifacts.
