# P3 — Arabic Transcription

## Status

**TECHNICAL PASS — MANUAL QUALITY REVIEW PENDING**

P2 is closed as PASS on the real WSL/Docker environment. The P3 runtime, transcription artifact, contract validation, and persistent model cache have now also passed on the real WSL/Docker host.

The only remaining P3 gate is a source-vs-transcript quality judgment for the representative Arabic sample. Automated validation proves that the pipeline is healthy; it does not prove word accuracy.

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

## Default profile

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

## Persistent model cache

Model weights live outside containers at:

```text
~/karve-data/models/whisper/
```

Inside the container this is `/karve-data/models/whisper/`.

The real-host persistence test verified approximately 1.62 GB of model data survives disposable container recreation.

The cache test measures file bytes from inside the Karve container both before and after recreation. This avoids host/container filesystem accounting differences from tools such as `du`.

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

Karve preserves the ASR output rather than silently rewriting Arabic in P3. Later presentation/caption layers may transform display text, but the original transcription remains the source artifact.

## Real-host verification — 2026-09-01

Representative project: `real-p2`.

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

The CPU transcription therefore ran substantially faster than realtime on the representative sample.

Commands that passed:

```bash
bash scripts/p3-run.sh real-p2 --language ar
bash scripts/p3-verify.sh real-p2 ar
bash scripts/p3-model-cache-test.sh
```

## What the automated PASS proves

The automated gate proves that:

- local faster-whisper inference works in the project image;
- Arabic can be explicitly selected;
- `transcript.json` is structurally valid;
- segments and word timings are present and internally valid;
- the expected runtime versions are available;
- model weights persist outside disposable containers;
- CPU performance is easily fast enough for this sample.

It does **not** measure word-error rate or semantic correctness against the spoken source.

A language probability of `1.0` means the model is confident the language is Arabic; it is not a transcription-accuracy score. Word probabilities are useful diagnostics but are also not a substitute for source comparison.

## Manual quality gate

Before P3 is closed as full PASS, compare the transcript to the actual representative video/audio and confirm:

- Arabic wording is materially correct;
- Arabic/English code-switching and technical terms are acceptable;
- repeated takes are represented accurately enough for later edit planning;
- segment boundaries are sensible;
- word timestamps are close enough for caption experiments.

If `turbo` text quality is insufficient, preserve the current result and compare the same project with `large-v3` before changing architecture.

Do not add WhisperX merely because a transcription contains text errors. WhisperX is reserved for the case where text is good but word alignment is measurably inadequate.

## P3 gate

Completed:

1. bootstrap/doctor with the P3 runtime — **PASS**;
2. representative Arabic project transcription — **PASS**;
3. `p3-verify.sh real-p2 ar` — **PASS**;
4. persistent model cache test — **PASS**;
5. CPU performance measurement — **PASS**.

Remaining:

6. manual source-vs-transcript quality acceptance.

P4 remains blocked until that final quality judgment is recorded.
