# P3 — Arabic Transcription

## Status

**READY FOR WSL HOST VERIFICATION**

P2 is closed as PASS on the real WSL/Docker environment with both the synthetic media gate and a representative real video.

P3 adds local speech-to-text only. It does not add LLM planning, rough cutting, captions, Remotion compositions, WhisperX, or GPU requirements.

## Goal

Given a P2 project containing `audio.wav`, Karve must create:

```text
~/karve-data/projects/<project-id>/transcript.json
```

with readable Arabic/English text, segment timestamps, word timestamps, language metadata, and runtime metrics.

## OSS choice

Karve uses `SYSTRAN/faster-whisper` directly instead of implementing ASR.

The P3 image pins:

```text
faster-whisper 1.2.1
```

The upstream project uses CTranslate2, supports CPU INT8 inference, word-level timestamps, and Silero VAD. The Python package is baked into the disposable Karve image; model weights are not.

## Default profile

```text
model:         turbo (large-v3-turbo)
device:        cpu
compute type:  int8
beam size:     5
word timing:   enabled
VAD:           enabled, upstream defaults
language:      auto unless explicitly supplied
```

For known Arabic content, pass `--language ar` rather than relying on language detection.

P3 deliberately starts with normal non-batched inference. We optimize only after measuring real accuracy/timing.

## Persistent model cache

First use downloads the selected model into:

```text
~/karve-data/models/whisper/
```

Inside the container this is `/karve-data/models/whisper/`.

The model survives image/container rebuilds. No model weights are stored in Git or baked into the image.

## Container changes

The Docker image contains an isolated Python virtual environment at `/opt/karve-venv`. `PATH` points to that environment. P3 dependencies are installed from `transcription/requirements.txt`.

The WSL/Windows host remains clean.

## `transcript.json` contract — v1

The output records the engine/model/runtime settings, requested/detected language, source duration, segment timestamps, word timestamps and probabilities, full text, segment/word counts, and performance metrics including realtime factor.

Karve preserves model text rather than applying Arabic rewriting/normalization in P3. Later caption/layout logic may transform presentation, but transcription remains the source artifact.

## First run after pulling P3

The image changed, so rebuild it once through the existing idempotent bootstrap:

```bash
git pull
bash scripts/bootstrap.sh
```

The environment doctor must report both `faster-whisper` and CTranslate2.

Then transcribe the existing real P2 project:

```bash
bash scripts/p3-run.sh real-p2 --language ar
```

On the first run, the model download may take time. Subsequent runs reuse the persistent cache.

Expected ending:

```text
P3 transcription: PASS
Language: ar (...)
Segments: ...
Words: ...
Realtime factor: ...
Output: /karve-data/projects/real-p2/transcript.json
```

## Verification

Validate the artifact without re-running transcription:

```bash
bash scripts/p3-verify.sh real-p2 ar
```

It checks schema version, nonempty text, segment/word counts, timestamp validity, word probabilities, expected language when supplied, source-duration bounds, and that the actual faster-whisper/CTranslate2 runtime is present.

Then verify the model weights are persistent outside containers:

```bash
bash scripts/p3-model-cache-test.sh
```

Expected ending:

```text
P3 model cache persistence: PASS
```

## Quality gate

Automated validity is not enough. Before closing P3, manually inspect `transcript.json` against the representative Arabic video:

- Arabic words must be materially correct.
- Technical English terms must be handled acceptably.
- Segment boundaries should make sense.
- Word timestamps must be close enough for caption experiments.
- CPU speed must be acceptable for the intended workflow.

If `turbo` accuracy is insufficient, compare the same project with:

```bash
bash scripts/p3-run.sh real-p2 --language ar --model large-v3 --force
```

Do not add WhisperX yet. WhisperX is justified only if transcription text is good but word timing is measurably inadequate.

## P3 gate

P3 becomes PASS only when:

1. bootstrap/doctor passes with the P3 runtime;
2. a representative Arabic project produces `transcript.json`;
3. `p3-verify.sh <project> ar` passes;
4. `p3-model-cache-test.sh` passes;
5. manual review confirms useful Arabic text and timestamp quality.

No P4 Bifrost/edit-plan work begins before this gate.

## Development-side verification before publication

Before publication, the P3 implementation was checked with:

- Python syntax compilation;
- shell syntax checks;
- a mocked faster-whisper model producing Arabic segments and word timestamps;
- JSON contract validation;
- overwrite protection;
- mocked wrapper/verification flow;
- verification that host-side FFmpeg is not required by the P3 verification path.

The actual model download/inference remains the real WSL/Docker host gate.
