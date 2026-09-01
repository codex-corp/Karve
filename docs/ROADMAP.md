# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable and documented before moving to the next.

## P0 — Host baseline

**Status: PASS**

### Goal
Validate the development host and workflow without installing the video/AI toolchain globally.

### Verified baseline
- Windows 11 available.
- WSL2 installed and healthy.
- Ubuntu runs under WSL2.
- Docker Engine + Compose run inside WSL; Docker on Windows is not required.
- Git access to `codex-corp/Karve` works and the repository is cloned.
- Storage capacity is confirmed sufficient for the MVP baseline.
- Persistent Karve data root selected as `~/karve-data/` on the WSL filesystem.

### Deliverable
- `docs/P0-HOST-BASELINE.md`

### Gate
PASS.

---

## P1 — WSL + container baseline

**Status: ACTIVE**

### Goal
Create one reproducible environment for development and runtime while keeping the Windows/WSL host installation minimal.

### Scope
- Dockerfile
- Docker Compose configuration
- Dev Container configuration
- persistent WSL-side bind mount
- idempotent bootstrap command
- doctor command
- persistence rebuild verification
- baseline Node/Python/uv/FFmpeg/Chromium/Arabic-font runtime installation

### Persistent data

```text
~/karve-data/
├── projects/
├── cache/
│   ├── huggingface/
│   ├── uv/
│   └── xdg/
├── models/
├── assets/
├── generated-components/
└── state/
```

### Deliberately deferred from P1
- faster-whisper and model downloads -> P3
- Bifrost adapter -> P4
- auto-editor/TightCut integration -> P5
- Remotion application/compositions/caption libraries -> P6
- Codex CLI motion fallback -> P7

### Gate
Both must pass on the actual WSL host:

```bash
bash scripts/bootstrap.sh
bash scripts/p1-verify-persistence.sh
```

A fresh container/image rebuild must not lose persistent Karve data, and `doctor` must report the baseline runtime healthy.

See `docs/P1-CONTAINER-BASELINE.md`.

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
- evaluate/integrate `auto-editor` before implementing equivalent custom cutting logic
- reuse appropriate TightCut patterns for filler/silence handling where useful
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
- Remotion application/runtime
- evaluate `remotion-captions-kit` before custom caption primitives
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
- evaluate reusable components/patterns from `claude-video-kit` and Vanta before custom equivalents
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
