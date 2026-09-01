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

**Status: TECHNICAL PASS — MANUAL QUALITY REVIEW PENDING**

### Goal
Produce useful local Arabic/English transcripts with segment and word timestamps.

### Initial engine
`faster-whisper==1.2.1` with `CTranslate2 4.8.2`.

### Default baseline

```text
model: turbo
runtime: CPU
compute: INT8
beam: 5
word timestamps: on
VAD: on
```

### Real-host result

Representative `real-p2` Arabic sample:

```text
source duration:       ~36.05 s
transcription time:    4.30 s
realtime factor:       ~0.119
language:              ar (1.000)
segments:              13
words:                 36
persistent model data: 1,621,704,312 bytes
```

Completed gates:

- local faster-whisper runtime in disposable image — PASS;
- representative Arabic transcription — PASS;
- transcript contract/timestamp validation — PASS;
- model-cache persistence across container recreation — PASS;
- CPU performance baseline — PASS.

Remaining gate:

- manual comparison of `transcript.json` with the actual speech, including Arabic/English code-switching and timestamp usefulness.

Automated validity and language probability are not transcription-accuracy measurements. If `turbo` text quality is not sufficient, compare the same source with `large-v3`. Add WhisperX only if the text is good but word alignment is measurably insufficient.

---

## P4 — Structured edit planning

**Status: BLOCKED BY FINAL P3 QUALITY GATE**

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

This is the first major visual-quality milestone: Karve should produce an edit that is not merely technically valid but visibly polished and publishable.

---

## P7 — Technical explainers

Concept cards, code cards, diagrams, comparisons, screenshots/images, template registry, and Codex CLI only when no reusable component exists. Reuse claude-video-kit/Vanta patterns where appropriate.

---

## P8 — QA and review

Confidence-aware decisions, render validation, overlay collision checks, optional sampled-frame multimodal QA, lightweight human review, and selective rerendering.

---

## Product-quality rule

A phase can pass its technical checks while the user-facing result is still unacceptable. For transcription, editing, captions, and motion, Karve must preserve a separate qualitative gate.

The target is a consistent Karve style rather than generic or over-edited AI output. Reusable style/profile rules should control cut aggressiveness, zoom frequency, captions, cards, transitions, and safe areas rather than allowing an LLM to improvise visual taste on every run.

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
