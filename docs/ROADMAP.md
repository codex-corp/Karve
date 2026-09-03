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

The real `sample-3-large` and `real-p2` plans passed manual semantic review. Raw transcript evidence remains separate from semantic interpretation.

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

Both passed A/V integrity checks and human playback review. Future tuning must change versioned profiles rather than the accepted architecture.

---

## P6 — Arabic captions + standard motion

**Status: PASS**

P6 turns verified P5 output into a reusable, profile-driven styled draft.

Accepted scope:

- P3/P4 source-time mapping through P5 `timeline-map.json`;
- Arabic RTL and mixed-language captions;
- active-word and semantic caption emphasis;
- sparse display-only P6-B ASR correction through Bifrost without mutating `transcript.json`;
- structural 1:1, N:1, 1:N, and N:M alignment with raw-source provenance;
- corrected display consistency for captions and ASR-derived title/callout presentation;
- selective P4-driven punch-ins;
- title/callout collision control;
- source, reel, and YouTube profiles;
- exact Remotion dependency lock;
- deterministic plan/schema/hash/media verification;
- CPU-supported rendering baseline.

Representative source/reel renders and the aggressive-cut `real-p2` path passed deterministic verification and human review. P6-B is closed as PASS.

The bounded P6-C `tech-test-01` experiment also proved the Visual Director direction: existing Karve artifacts -> bounded Codex mission -> installed `video-talkcraft` Skill -> plan-first visual implementation -> Remotion render. P6-C remained isolated and did not become the canonical P6 renderer; its successful architecture is promoted into P7.

See `docs/P6-CAPTIONS-MOTION.md` for the closed P6 contract.

---

## P7 — Technical explainers & Visual Director

**Status: ACTIVE — ARCHITECTURE / CONTRACT GATE**

### Goal

Productize the successful P6-C pattern so Karve can create grounded technical visual explanations while retaining ownership of source truth, timing, captions, accepted cuts, evidence, final composition, and verification.

Primary architecture:

```text
accepted P2-P6 artifacts
        -> bounded P7 mission
        -> Codex PLAN ONLY
        -> visual-plan schema + grounding validation
        -> Codex IMPLEMENT + RENDER
        -> Karve-controlled assembly / verification
```

`video-talkcraft` is the primary upstream visual-direction vocabulary. Use existing Karve primitives first, then upstream recipes, then tiny adapters/custom components only for measured gaps. Do not bulk-vendor a motion library.

### Milestones

```text
P7-A  Phase contract & production boundary        ACTIVE
P7-B  Visual mission contract                     PENDING
P7-C  Visual-plan schema + grounding validator    PENDING
P7-D  Segment selection                           PENDING
P7-E  Codex plan runner                           PENDING
P7-F  Codex implementation runner                 PENDING
P7-G  Generated component lifecycle               PENDING
P7-H  Karve-controlled final assembly             PENDING
P7-I  Additional visual modes                     PENDING
P7-J  Production acceptance                       PENDING
```

The first implementation slice after P7-A is **P7-B + P7-C**. Do not automate Codex execution before Karve can generate and validate a trustworthy mission and visual plan.

Acceptance requires representative architecture/concept, real code/terminal, and real UI/tutorial samples. Technical PASS alone is insufficient; the P7 output must be materially easier to understand than the P6 baseline without unsupported claims or invented UI/data.

See `docs/P7-TECHNICAL-EXPLAINERS.md`.

---

## P8 — QA and review

**Status: BLOCKED BY P7**

Confidence-aware decisions, sampled-frame validation, overlay collision checks, lightweight human review, selective rerendering, and quality automation remain P8 work unless a minimal validator is required to make a P7 contract safe.

---

## Product-quality rule

Karve targets a consistent, publishable editing taste rather than a technically valid but generic or over-edited result.

Reusable profiles control deterministic behavior. AI/agent passes may propose bounded semantic/visual intent, but Karve retains truth, timing, evidence, validation, and final render ownership.

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
