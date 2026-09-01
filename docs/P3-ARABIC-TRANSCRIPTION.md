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

## Accepted default profile

```text
model:         turbo (large-v3-turbo)
device:        cpu
compute type:  int8
beam size:     5
word timing:   enabled
VAD:           enabled
language:      auto unless explicitly supplied
```

For known Arabic content, use `--language ar` rather than relying on language detection.

`large-v3` remains available as an explicit comparison/quality option, but it is not the automatic fallback and is not the default in V1.

## Persistent model cache

Model weights live outside containers at:

```text
~/karve-data/models/whisper/
```

Inside the container this is `/karve-data/models/whisper/`.

The real-host persistence test verified approximately 1.62 GB of `turbo` model data survives disposable container recreation.

The cache test measures file bytes from inside the Karve container both before and after recreation. This avoids host/container filesystem accounting differences.

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

A third sample (`test-video-3.mp4`, ~25.70 s) intentionally stressed fast Aleppine/Syrian dialect. `turbo` was manually graded about **B / ~80% understandable**. Errors included dialect/proper-word recognition such as `مقترب` vs `مغترب`, a bad rendering of `بإسبانيا`, `لاشتاك` vs `لهجتك`, and errors in the final Aleppine phrase.

The same difficult sample was then run with `large-v3` on CPU INT8:

```text
source duration:         25.704 s
transcription time:      12.342 s
realtime factor:         0.4801
segments:                7
words:                   55
```

`large-v3` improved some tokens (`فهد`, `لغتك`) but did not consistently solve the important dialect errors. It still produced `مفترب` instead of `مغترب`, rendered the `بإسبانيا` phrase worse as `بالأسف حبيت`, produced `لحشتك` instead of `لهجتك`, and did not improve the final Aleppine phrase enough to justify making it the default.

A fourth, clearer Arabic sample using `large-v3` (~69.59 s) produced very strong text and proper-noun handling, with:

```text
transcription time:      32.997 s
realtime factor:         0.4742
segments:                31
words:                   96
```

This confirms `large-v3` is viable when explicitly requested, but the hard-dialect A/B test did not show a reliable quality advantage over `turbo`.

## Final P3 model decision

For V1:

- `turbo` remains the default because it is fast and already reaches high quality on normal Arabic speech;
- `large-v3` remains an explicit opt-in comparison/quality model, not an automatic fallback;
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
7. `turbo` vs `large-v3` decision recorded — **PASS**.

P3 is closed. P4 may begin.