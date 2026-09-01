# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable and documented before moving to the next.

## P0 — Host baseline

**Status: PASS**

Verified Windows 11 -> WSL2 -> Ubuntu workflow, WSL-native Docker Engine/Compose, Git access, storage, and the persistent WSL data root `~/karve-data/`.

See `docs/P0-HOST-BASELINE.md`.

---

## P1 — WSL + container baseline

**Status: PASS**

### Goal
Create one reproducible development/runtime environment while keeping the Windows/WSL host installation minimal.

### Verified on the real WSL host

- Dockerfile / Compose / Dev Container baseline works.
- `bootstrap.sh` PASS.
- `doctor.sh` PASS.
- persistence verification survives Compose teardown + image rebuild.
- persistent bind mount is `/home/hany/karve-data` on WSL.
- Node, pnpm, Python, uv, FFmpeg/ffprobe, Chromium, jq, fontconfig, and Noto Sans Arabic resolve inside the container.

See `docs/P1-CONTAINER-BASELINE.md`.

---

## P2 — Media ingest

**Status: READY FOR WSL HOST VERIFICATION**

### Goal
Prove the local deterministic media layer before adding AI.

### Scope
- `ffprobe` metadata extraction
- source validation
- persistent project directory creation
- transcription-ready audio extraction (16 kHz mono PCM)
- deterministic short H.264/AAC verification render
- synthetic WSL/Docker smoke test
- real source-video wrapper with read-only source mount

### Deliverables

```text
~/karve-data/projects/<project-id>/
├── source.json
├── audio.wav
└── media-test.mp4
```

### Gate
Both must pass on the actual WSL environment:

```bash
bash scripts/p2-verify.sh
bash scripts/p2-run.sh /path/to/real-video.mp4 --project real-p2
```

P2 passes when the synthetic gate and one representative real talking-head/camera video both produce valid persistent artifacts.

See `docs/P2-MEDIA-INGEST.md`.

---

## P3 — Arabic transcription

**Status: BLOCKED BY P2**

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
- keep/remove ranges, silence/retry recommendations, emphasis moments, punch-in suggestions, caption emphasis, title/list/callout/explainer suggestions

### Gate
Karve produces a valid schema-conformant `edit-plan.json` for a real Arabic source video.

---

## P5 — Rough cut

### Goal
Turn validated edit decisions into a watchable draft.

### Scope
- evaluate/integrate `auto-editor` before custom equivalent cutting logic
- reuse appropriate TightCut patterns for filler/silence handling
- deterministic cut application
- safe cut margins
- source-time -> output-time mapping
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
- Arabic RTL + English/LTR captions
- word/phrase highlighting
- title cards, punch-ins, lists, callouts
- reusable Remotion components
- reel/short/YouTube profiles

### Gate
One Arabic reel and one 16:9 technical video pass manual review for caption readability, timing, layout, and standard motion quality.

---

## P7 — Technical explainers

### Goal
Add reusable explanatory graphics without turning every render into code generation.

### Scope
- evaluate components/patterns from `claude-video-kit` and Vanta before custom equivalents
- concept cards, architecture diagrams, code cards, step lists, comparisons, screenshot/image insertion
- template registry
- Codex CLI fallback only when no suitable reusable component exists

### Gate
A technical source video automatically renders at least three distinct explainer types while remaining deterministic on reruns.

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
A user can review/correct an automated edit without rebuilding the pipeline manually or reprocessing unchanged phases.

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
