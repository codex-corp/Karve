# Karve Roadmap

Karve is built through explicit phase gates. A phase that affects user-facing output must pass both deterministic verification and manual quality review.

## P0 — Host baseline

**Status: PASS**

Windows 11, WSL2/Ubuntu, WSL-native Docker Engine/Compose, Git access, storage, and the WSL-side persistent data root were verified.

---

## P1 — WSL + container baseline

**Status: PASS**

The real host verified the disposable image, Dev Container contract, bootstrap/doctor, UID/GID mapping, Arabic fonts, and persistent state. The final runtime baseline is Ubuntu 24.04.

---

## P2 — Media ingest

**Status: PASS**

FFmpeg/ffprobe produce deterministic source metadata, normalized 16 kHz mono audio, and a short media-test artifact for synthetic and real video.

---

## P3 — Arabic transcription

**Status: PASS**

```text
quality/default -> faster-whisper large-v3 / CPU INT8 / word timestamps / VAD
fast            -> faster-whisper turbo    / CPU INT8 / word timestamps / VAD
```

The real host passed timestamp structure, model-cache persistence, CPU performance, and multi-sample Arabic review. WhisperX remains deferred because the measured limitation is difficult-word recognition rather than alignment.

---

## P4 — Structured edit planning

**Status: PASS**

```text
source.json + transcript.json
        -> Karve planner
        -> local Bifrost
        -> AWS Bedrock Qwen 235B
        -> strict json_schema
        -> Ajv + semantic validation
        -> edit-plan.json
```

The real `sample-3-large` and `real-p2` plans passed manual semantic review. Gemini is excluded from the current path to conserve its credits.

---

## P5 — Rough cut

**Status: PASS**

Karve integrates pinned `auto-editor 31.5.0`, merges deterministic silence proposals with P4 semantic cuts and keep protection, generates `timeline-map.json`, and renders through FFmpeg.

Real acceptance:

```text
real-p2:
  source:      ~36.04 s
  rough cut:   ~17.57 s
  purpose:     aggressive false-start cleanup

sample-3-large:
  source:      25.70 s
  rough cut:   ~24.45 s
  purpose:     conservative narrative preservation
```

Both passed A/V integrity checks and human playback review. Current evidence is representative but still a small sample; future tuning should change versioned profiles, not the accepted architecture.

---

## P6 — Arabic captions + standard motion

**Status: IMPLEMENTED — REAL WSL/REMOTION VISUAL QUALITY GATE PENDING**

### Goal

Turn a verified P5 rough cut into a visibly polished styled draft.

### Adopted OSS

```text
remotion:                 4.0.520
@remotion/cli:            4.0.520
@remotion/captions:       4.0.520
remotion-captions-kit:    0.2.0
```

Karve reuses caption timing/pagination primitives and adds only its Arabic RTL/timeline/style compatibility layer.

### Implemented scope

- map P3 words and P4 intents through P5 `timeline-map.json`;
- Arabic RTL captions and mixed-language token isolation;
- active-word and semantic caption emphasis;
- selective P4-driven punch-ins;
- title/callout cards with collision control;
- source, 1080x1920 reel, and 1920x1080 YouTube profiles;
- versioned `karve-clean-v1` style;
- deterministic presentation-plan schema and verifier;
- exact input/output hashes and render metadata.

`explainer` intent remains deferred to P7. P6 does not make another LLM call or generate one-off code.

### Gate

P6 closes only after source/reel renders on `sample-3-large`, a source render on aggressive-cut `real-p2`, deterministic verification, and manual review of Arabic shaping/order, timing, safe areas, reframing, cards, zoom restraint, audio sync, and overall publishability. Capture a resolved dependency lockfile before final reproducibility acceptance.

---

## P7 — Technical explainers

**Status: BLOCKED BY P6**

Concept cards, code cards, diagrams, comparisons, screenshots/images, a template registry, and Codex CLI only when no reusable component exists. Reuse `claude-video-kit` and Vanta patterns selectively.

---

## P8 — QA and review

**Status: BLOCKED BY P7**

Confidence-aware decisions, sampled-frame validation, overlay collision checks, lightweight human review, and selective rerendering.

---

## Product-quality rule

Karve targets a consistent, publishable editing taste rather than a technically valid but generic or over-edited result.

Reusable profiles control pacing, captions, zoom frequency, cards, transitions, and safe areas. LLMs propose semantic intent; deterministic code and reusable components own execution.

## Deferred until measured need

- PostgreSQL
- Redis
- queues/workers
- microservices
- local LLM hosting
- WhisperX
- GPU-only requirements
- direct Bedrock integration
- full NLE/timeline UI
