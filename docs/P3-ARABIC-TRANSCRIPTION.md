# P3 — Arabic Transcription

## Status

**PASS**

P3 is closed on the real WSL/Docker host. Local faster-whisper inference, transcript structure, model-cache persistence, CPU performance, timestamps, and manual Arabic quality review all passed at a level sufficient to continue to structured edit planning.

P3 adds local speech-to-text only. It does not add LLM planning, rough cutting, captions, Remotion compositions, WhisperX, or GPU requirements.

## Goal

Given a P2 project containing `audio.wav`, Karve creates:

```text
~/karve-data/projects/<project-id>/transcript.json
```

with Arabic/English text, segment timestamps, word timestamps, language metadata, probabilities, and runtime metrics.

## OSS choice

Karve uses `SYSTRAN/faster-whisper` directly instead of implementing ASR.

Pinned runtime:

```text
faster-whisper 1.2.1
CTranslate2 4.8.2
```

The Python package is baked into the disposable Karve image; model weights are not.

## Accepted V1 profiles

### Quality / default

```text
model:         large-v3
device:        cpu
compute type:  int8
beam size:     5
word timing:   enabled
VAD:           enabled
language:      auto unless explicitly supplied
```

### Fast

```text
model:         turbo (large-v3-turbo)
device:        cpu
compute type:  int8
beam size:     5
word timing:   enabled
VAD:           enabled
```

For known Arabic content, use `--language ar` rather than relying on language detection.

There is no automatic two-pass fallback in V1. The caller explicitly chooses the desired profile/model.

## Persistent model cache

Model weights live outside containers at:

```text
~/karve-data/models/whisper/
```

Inside the container this is `/karve-data/models/whisper/`.

The real-host persistence test verified model data survives disposable container recreation. Model weights are not committed to Git or baked into the image.

## Container runtime

The Docker image contains an isolated Python virtual environment at `/opt/karve-venv`. `PATH` points to it. P3 dependencies are installed from `transcription/requirements.txt`.

The WSL/Windows host remains clean.

## `transcript.json` contract — v1

The artifact records:

- engine/model/runtime settings;
- requested and detected language;
- source duration;
- full text;
- segment timestamps;
- word timestamps and probabilities;
- segment/word counts;
- transcription duration;
- realtime factor.

Karve preserves the raw ASR output rather than silently rewriting Arabic. Later planning/caption layers may derive corrected or presentation-oriented text, but the original transcription remains a source artifact.

Word probabilities are retained as a soft confidence signal for later phases. They are not an accuracy score and must not be used as a hard truth threshold: some incorrect dialect words can still have moderate or high probability.

## Real-host verification — 2026-09-01

### Baseline sample — `real-p2`

Using `turbo`:

```text
Requested/detected language: ar
Language probability:        1.000
Segments:                    13
Words:                       36
Source duration:             ~36.05 s
Transcription time:          4.30 s
Realtime factor:             ~0.119
faster-whisper:              1.2.1
CTranslate2:                 4.8.2
Persistent model bytes:      1,621,704,312
```

Passed commands:

```bash
bash scripts/p3-run.sh real-p2 --language ar
bash scripts/p3-verify.sh real-p2 ar
bash scripts/p3-model-cache-test.sh
```

### Additional Arabic quality samples

A second short Arabic sample using `turbo` was manually graded **A**: the transcript was essentially correct with one minor word-form error (`كفيديا` vs `كفيديو`).

A third sample (`test-video-3.mp4`) intentionally stressed fast Aleppine/Syrian dialect and was run twice on the **same source** under separate projects.

Direct A/B result:

```text
source audio: ~25.33 s

turbo:
  transcription: ~5.21 s
  realtime factor: ~0.20

large-v3:
  transcription: ~14.13 s
  realtime factor: ~0.55
```

`large-v3` materially improved several semantically important dialect/transcription points on the same difficult source:

```text
name:           فهل        -> فهد
phrase:         و تشوف     -> وقت تشوف
verb phrase:    عبي حكي    -> عم يحكي
word form:      لغتاك      -> لغتك
```

Both models still struggled with some strongly dialectal/proper-name wording (`مغترب`, `بإسبانيا`, `لهجتك`, and the final Aleppine phrase). The larger model is therefore not perfect, but its improvement in sentence structure and meaning is more valuable to downstream editing than the additional CPU time is costly.

A fourth clearer Arabic sample using `large-v3` (~69.59 s) also showed strong handling of names, places, food terms, and repeated speech:

```text
transcription time:      32.997 s
realtime factor:         0.4742
segments:                31
words:                   96
```

This keeps quality-mode transcription comfortably faster than realtime on the tested CPU-only host.

## Final P3 model decision

For V1:

- `large-v3` is the **Quality/default** profile because same-source A/B testing showed a meaningful improvement in Arabic dialect structure and semantics;
- `turbo` is the **Fast** profile because it is substantially faster and already performs very well on clearer Arabic;
- no automatic two-pass transcription is added yet;
- no WhisperX is added because the measured limitation is text recognition, not timestamp alignment;
- difficult dialect and technical vocabulary remain known quality cases to improve only when measured against real Karve videos.

The project should not block progress while chasing perfect ASR. P4/P6/P8 must preserve the distinction between raw ASR text, semantic interpretation, display text, and confidence-aware QA.

## P3 gate — final

1. bootstrap/doctor with the P3 runtime — **PASS**;
2. representative Arabic project transcription — **PASS**;
3. transcript contract/timestamp verification — **PASS**;
4. persistent model cache test — **PASS**;
5. CPU performance measurement — **PASS**;
6. manual Arabic quality review across multiple samples — **PASS WITH DOCUMENTED DIALECT LIMITATION**;
7. same-source `turbo` vs `large-v3` decision recorded — **PASS**.

P3 is closed. P4 may proceed.
