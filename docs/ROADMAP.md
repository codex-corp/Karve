# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable and documented before moving to the next.

## P0 — Host baseline

### Goal
Validate the development host and workflow without installing the video/AI toolchain globally.

### Checks
- Windows 11 available.
- WSL2 installed and starts successfully.
- Ubuntu distribution available.
- Docker Desktop / Docker Engine available and WSL integration enabled.
- Git access to `codex-corp/Karve` works from the intended workflow.
- Sufficient free disk space exists for source media, Docker images, Whisper model cache, and renders.
- Confirm where persistent Karve data will live inside the WSL filesystem.

### Deliverables
- `docs/P0-HOST-BASELINE.md`
- host-check commands and recorded results
- chosen WSL data path

### Gate
P0 passes only when the repository can be cloned/opened from WSL and Docker can run a basic Linux container successfully.

---

## P1 — WSL + container baseline

### Goal
Create one reproducible environment for development and runtime while keeping host installation minimal.

### Scope
- Dockerfile
- Docker Compose configuration
- Dev Container configuration
- persistent mounts
- bootstrap command
- doctor command
- Node/Python/FFmpeg/Chromium/Arabic-font runtime installation

### Persistent data
Expected location:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
└── generated-components/
```

### Gate
A fresh container can be rebuilt without losing any persistent project/cache/model data, and `doctor` reports the baseline runtime healthy.

---

## P2 — Media ingest

### Goal
Prove the local deterministic media layer before adding AI.

### Scope
- `ffprobe` metadata extraction
- source validation
- audio extraction
- basic normalization
- deterministic short test render
- project working directory creation

### Gate
Given a supported source MP4, Karve produces:

```text
project/
├── source.json
├── audio.wav
└── media-test.mp4
```

with validated duration, dimensions, frame rate, codecs, and audio metadata.

---

## P3 — Arabic transcription

### Goal
Produce useful local Arabic/English transcripts with timestamps.

### Initial engine
`faster-whisper`

WhisperX/forced alignment is explicitly deferred until timing quality is measured.

### Scope
- persistent Whisper model cache
- model configuration
- Arabic language handling
- segments + timestamps
- word timestamps when supported/reliable
- normalized JSON output

### Gate
A representative Arabic talking-head sample produces a readable transcript with timing accurate enough for initial caption experiments.

---

## P4 — Structured edit planning

### Goal
Use the existing Bifrost API router as the AI planning boundary.

### Scope
- Bifrost client/adapter
- no direct Bedrock SDK integration
- transcript + media-analysis input
- versioned JSON schema
- schema validation
- deterministic retry/failure behavior

### Initial edit decisions
- keep/remove ranges
- silence/retry recommendations
- emphasis moments
- punch-in suggestions
- caption emphasis
- title/list/callout suggestions
- explainer requests

### Gate
Karve produces a valid, schema-conformant `edit-plan.json` for a real Arabic source video.

---

## P5 — Rough cut

### Goal
Turn validated edit decisions into a watchable draft.

### Scope
- deterministic cut application
- safe cut margins
- source time -> output time mapping
- audio continuity checks
- render manifest

### Gate
The generated draft removes selected dead space/retries without clipping speech or corrupting A/V sync.

---

## P6 — Captions + standard motion

### Goal
Deliver the first result that visibly resembles a polished social/technical edit.

### Scope
- Arabic RTL caption layout
- English/LTR support
- word/phrase highlighting
- title cards
- punch-ins
- simple lists
- callouts
- reusable Remotion components
- reel/short/YouTube profiles

### Gate
One Arabic reel and one 16:9 technical video pass manual review for caption readability, timing, layout, and standard motion quality.

---

## P7 — Technical explainers

### Goal
Add reusable explanatory graphics without turning every render into code generation.

### Scope
- concept cards
- architecture diagrams
- code cards
- step lists
- comparison layouts
- screenshot/image insertion
- template registry
- Codex CLI fallback for missing custom components

### Rule
Use a reusable template whenever possible. Invoke Codex only when no suitable component exists.

### Gate
A technical source video can automatically render at least three distinct explainer types while remaining deterministic on reruns.

---

## P8 — QA and review

### Goal
Make automation safe enough for routine use.

### Scope
- confidence-aware decisions
- render validation
- missing/colliding overlay checks
- optional sampled-frame multimodal review
- lightweight human review workflow
- selective rerendering

### Gate
A user can review and correct an automated edit without rebuilding the pipeline manually or reprocessing unchanged phases.

---

## Deferred until justified

Do not add these by default:

- PostgreSQL
- Redis
- queues/workers
- microservices
- local LLM hosting
- WhisperX
- GPU-only runtime requirements
- direct Bedrock integration
- full NLE/timeline UI

If one becomes necessary, record the measured problem first and make the architectural change separately.
