# Karve Roadmap

Karve is built through explicit phase gates. Each phase must be independently testable on the target environment and must pass a product-quality review when it affects user-facing output.

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

Synthetic and representative real-video gates passed. P2 produces deterministic source metadata, normalized audio, and a short media-test artifact.

---

## P3 — Arabic transcription

**Status: PASS**

Engine: `faster-whisper==1.2.1` with `CTranslate2 4.8.2`.

Accepted V1 profiles:

```text
quality/default -> large-v3 / CPU INT8 / beam 5 / word timestamps / VAD
fast            -> turbo    / CPU INT8 / beam 5 / word timestamps / VAD
```

The real host passed transcript/timestamp validation, persistent model-cache verification, CPU performance, and manual Arabic quality review across multiple samples. The difficult same-source Aleppine/Syrian A/B justified `large-v3` for quality/default while retaining `turbo` for speed.

WhisperX remains deferred because the measured limitation is difficult-word recognition, not timestamp alignment. Word probabilities remain soft confidence evidence, not hard accuracy scores.

---

## P4 — Structured edit planning

**Status: PASS**

### Accepted architecture

```text
source.json + transcript.json
        -> Karve P4 planner
        -> local Bifrost
        -> AWS Bedrock Qwen 235B
        -> strict json_schema
        -> Ajv + semantic validation
        -> edit-plan.json + edit-plan.meta.json
```

Quality/default model:

```text
bedrock/qwen.qwen3-235b-a22b-2507-v1:0
```

Gemini is intentionally excluded from the current path to conserve its limited credits.

### Real-host result

`sample-3-large`:

```text
P4 verification: PASS
keep decisions:   7
remove decisions: 1
visual intents:   3
```

The plan preserved the emotional narrative, removed only the meaningful silence gap, and proposed selective caption emphasis, callout, and punch-in intent.

`real-p2`:

```text
P4 verification: PASS
keep decisions:   2
remove decisions: 2
visual intents:   2
```

The planner identified the repeated/false-start material as semantic removals and preserved the later resolved speech. The visual intents were relevant rather than generic.

Quality-route metadata:

```text
model:           Qwen 235B through Bedrock/Bifrost
structured mode: strict json_schema
attempts:        1
wall-clock:      ~9.46 s
schema:          PASS
semantic checks: PASS
```

### Fast-profile follow-up

The configured `nova-2-lite` Fast route returned AWS 400 on the real account. The host inventory indicated the regional Nova Lite identifier instead, so the candidate is corrected to:

```text
bedrock/apac.amazon.nova-lite-v1:0
```

It is optional and remains **UNVERIFIED AFTER ID CORRECTION** until re-probed. P4 acceptance is based on the fully working Quality/default route and is not blocked by this optional profile.

The exact installed Bifrost version/commit was not captured in the reported host gate. Because Karve only uses the live-tested small API surface and does not alter version-sensitive gateway configuration, this is a reproducibility follow-up rather than a functional P4 blocker.

---

## P5 — Rough cut

**Status: ACTIVE**

### Goal

Turn validated P4 semantic decisions plus deterministic media analysis into a watchable rough cut without clipping speech or breaking A/V sync.

### OSS-first rule

Evaluate and integrate `WyattBlue/auto-editor` before building an equivalent silence/dead-space engine. Reuse useful TightCut patterns selectively, but do not invoke another transcription pipeline or duplicate Karve's existing faster-whisper work.

### Planned scope

- consume the original source plus P4 `edit-plan.json`;
- obtain deterministic silence/dead-space proposals from auto-editor where appropriate;
- merge P4 semantic `remove` ranges with deterministic proposals;
- treat meaningful P4 `keep` regions as protection evidence when resolving conflicts;
- apply safe margins so speech is not clipped;
- keep all cut decisions auditable in a merged timeline artifact;
- maintain source-to-output time mapping for captions and visual intents in later phases;
- produce a watchable rough-cut MP4 and render manifest;
- verify audio continuity and A/V sync.

P4 visual intents are carried forward as metadata only. P5 does not render punch-ins, captions, cards, or explainers.

### Gate

A representative real Arabic project must produce a rough cut where obvious false starts/dead space are removed, meaningful speech is preserved, cut edges sound natural, A/V sync remains correct, and the timeline mapping is reproducible.

---

## P6 — Captions + standard motion

Arabic RTL captions, word/phrase highlighting, punch-ins, titles, lists, callouts, reusable Remotion components, and reel/short/YouTube profiles. Evaluate `remotion-captions-kit` first.

This is the first major visual-quality milestone: the result should be visibly polished and publishable, not merely technically valid.

---

## P7 — Technical explainers

Concept cards, code cards, diagrams, comparisons, screenshots/images, template registry, and Codex CLI only when no reusable component exists. Reuse `claude-video-kit`/Vanta patterns where appropriate.

---

## P8 — QA and review

Confidence-aware decisions, render validation, overlay collision checks, optional sampled-frame multimodal QA, lightweight human review, and selective rerendering.

---

## Product-quality rule

A phase can pass technical checks while the user-facing result is still unacceptable. Karve targets a consistent editing taste rather than generic or over-edited AI output.

Reusable style/profile rules should eventually control cut aggressiveness, zoom frequency, captions, cards, transitions, and safe areas instead of allowing an LLM to improvise visual taste on every run.

Karve follows **adopt > adapt > build**: use mature OSS first, adapt selectively when needed, and write custom equivalents only when a suitable reusable implementation does not exist.

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
