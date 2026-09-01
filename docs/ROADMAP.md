# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable on the target environment before moving on.

## P0 — Host baseline

**Status: PASS**

Windows 11, WSL2/Ubuntu, WSL-native Docker Engine/Compose, Git access, storage, and the WSL-side persistent data root were verified.

---

## P1 — WSL + container baseline

**Status: PASS**

The real WSL/Docker gate verified the disposable image, Dev Container contract, bootstrap/doctor, UID/GID mapping, Arabic fonts, and persistent state across rebuilds.

---

## P2 — Media ingest

**Status: PASS**

Synthetic and representative real-video gates passed. P2 produces:

```text
project/
├── source.json
├── audio.wav
└── media-test.mp4
```

The real `real-p2` project verified H.264/AAC ingest, 16 kHz mono PCM extraction, metadata, and deterministic short render.

---

## P3 — Arabic transcription

**Status: READY FOR WSL HOST VERIFICATION**

### Goal
Produce useful local Arabic/English transcripts with segment and word timestamps.

### Initial engine
`faster-whisper==1.2.1`

### Default baseline

```text
model: turbo
runtime: CPU
compute: INT8
beam: 5
word timestamps: on
VAD: on
```

### Scope
- package installed only in the disposable image;
- model weights persisted under `~/karve-data/models/whisper/`;
- consume existing P2 `audio.wav` rather than re-decoding video;
- Arabic/English explicit language or auto detection;
- `transcript.json` v1;
- segments + word timestamps/probabilities;
- CPU timing/realtime-factor measurement;
- manual Arabic quality check.

### Gate
A representative Arabic project must:

1. transcribe successfully with local faster-whisper;
2. pass `scripts/p3-verify.sh <project> ar`;
3. pass `scripts/p3-model-cache-test.sh`;
4. be manually judged accurate enough for initial caption experiments.

If text quality is weak, compare `turbo` and `large-v3`. Add WhisperX only if text is good but timestamp alignment is measurably insufficient.

---

## P4 — Structured edit planning

### Goal
Use the existing Bifrost API router as the AI planning boundary.

### Scope
- Bifrost adapter only; no duplicate direct Bedrock SDK path;
- transcript + deterministic media metadata input;
- versioned edit-plan JSON schema;
- keep/remove ranges, retries, emphasis, punch-ins, caption emphasis, titles/callouts/explainers;
- schema validation and deterministic failure/retry behavior.

### Gate
A real Arabic project produces a valid schema-conformant `edit-plan.json`.

---

## P5 — Rough cut

### Goal
Turn validated decisions into a watchable draft.

### Scope
- evaluate/integrate auto-editor before custom equivalent logic;
- reuse useful TightCut patterns;
- safe margins and source->output time mapping;
- audio continuity and render manifest.

### Gate
Dead space/retries are removed without clipping speech or corrupting A/V sync.

---

## P6 — Captions + standard motion

Arabic RTL captions, word/phrase highlighting, punch-ins, titles, lists, callouts, reusable Remotion components, and reel/short/YouTube profiles. Evaluate remotion-captions-kit first.

---

## P7 — Technical explainers

Concept cards, code cards, diagrams, comparisons, screenshots/images, template registry, and Codex CLI only when no reusable component exists. Reuse claude-video-kit/Vanta patterns where appropriate.

---

## P8 — QA and review

Confidence-aware decisions, render validation, overlay collision checks, optional sampled-frame multimodal QA, lightweight human review, and selective rerendering.

---

## Deferred until measured need

- PostgreSQL
- Redis
- queues/workers
- microservices
- local LLM hosting
- WhisperX
- GPU-only runtime requirements
- direct Bedrock integration
- full NLE/timeline UI
