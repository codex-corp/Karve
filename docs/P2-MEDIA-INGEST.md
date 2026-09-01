# P2 — Media Ingest

## Status

**READY FOR WSL HOST VERIFICATION**

P1 is closed as PASS on the real WSL/Docker environment. P2 now proves the deterministic media boundary before Whisper, LLM planning, automatic cutting, captions, or motion graphics are introduced.

## Goal

Given a readable video with at least one video stream and one audio stream, Karve must create a small persistent project baseline:

```text
~/karve-data/projects/<project-id>/
├── source.json
├── audio.wav
└── media-test.mp4
```

The source video itself is mounted read-only into the disposable container; it is not copied into the Karve project directory.

## Reuse decision

P2 uses **FFmpeg + ffprobe directly**. We deliberately do not add a custom media framework, MoviePy, a Node media wrapper, a database, or a queue.

This follows `docs/OSS-ADOPTION.md`: use the mature media engine as the boundary and keep Karve-specific code limited to validation, normalization, artifact layout, and diagnostics.

## Scripts

### `scripts/p2-ingest.sh`

Low-level container-side ingest adapter. It:

1. validates the source exists and is readable;
2. probes the source with `ffprobe`;
3. requires at least one video and one audio stream;
4. records normalized metadata in `source.json`;
5. extracts transcription-ready PCM audio;
6. renders a short deterministic H.264/AAC sample;
7. validates the generated artifacts before moving them into the persistent project directory.

### `scripts/p2-run.sh`

WSL-side user wrapper for a real source video. It bind-mounts the source **read-only** into the Karve container and invokes `p2-ingest.sh`.

Example:

```bash
bash scripts/p2-run.sh ~/Videos/sample.mp4 --project sample
```

The source may live outside the repository and outside `~/karve-data`. A source under `/mnt/*` is allowed, but the wrapper warns that Windows-filesystem I/O may be slower.

### `scripts/p2-smoke-test.sh`

Container-side self-test. It generates a small synthetic H.264/AAC fixture with FFmpeg, runs the same ingest adapter, and asserts the P2 contract.

### `scripts/p2-verify.sh`

WSL-side phase gate wrapper:

```bash
bash scripts/p2-verify.sh
```

It runs the smoke test through the real Karve Compose environment.

## `source.json` contract — v1

The initial contract records only metadata needed by later phases:

```json
{
  "schema_version": 1,
  "project_id": "sample",
  "source": {
    "file_name": "sample.mp4",
    "size_bytes": 123456,
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
    "format_long_name": "QuickTime / MOV",
    "duration_seconds": 42.5,
    "bit_rate": 12000000
  },
  "video": {
    "codec": "h264",
    "profile": "High",
    "width": 1920,
    "height": 1080,
    "pixel_format": "yuv420p",
    "avg_frame_rate": "30/1",
    "r_frame_rate": "30/1",
    "time_base": "1/15360",
    "rotation": 0
  },
  "audio": {
    "codec": "aac",
    "sample_rate": 48000,
    "channels": 2,
    "channel_layout": "stereo",
    "time_base": "1/48000"
  },
  "normalized_audio": {
    "codec": "pcm_s16le",
    "sample_rate": 16000,
    "channels": 1
  },
  "artifacts": {
    "audio": "audio.wav",
    "media_test": "media-test.mp4"
  }
}
```

The contract is intentionally small. Raw ffprobe output is not persisted yet because no later phase requires every field.

## Audio normalization

In P2, "normalization" means **format normalization for transcription**, not loudness mastering:

```text
PCM signed 16-bit little endian
16 kHz
mono
```

This creates a predictable input for P3 speech-to-text while leaving loudness processing to a later measured requirement.

## Test render

`media-test.mp4` is a maximum five-second verification render:

- first video stream;
- first audio stream;
- H.264 (`libx264`);
- AAC audio;
- `yuv420p` pixel format;
- width capped at 1280 while preserving aspect ratio;
- even dimensions for H.264 compatibility;
- `+faststart` MP4 layout.

It exists only to prove decode -> process -> encode -> mux works. It is not the final editing/rendering strategy.

## P2 verification sequence

After pulling the P2 changes on WSL:

```bash
git pull
bash scripts/p2-verify.sh
```

Expected ending:

```text
P2 media ingest verification: PASS
```

Then run one representative real video:

```bash
bash scripts/p2-run.sh /path/to/real-video.mp4 --project real-p2
```

Expected ending:

```text
P2 ingest: PASS
Project: real-p2
Output: /karve-data/projects/real-p2
```

Inspect the persistent results from WSL at:

```text
~/karve-data/projects/real-p2/
```

## P2 gate

P2 is PASS only when:

1. `bash scripts/p2-verify.sh` passes on the actual WSL/Docker environment; and
2. one representative real talking-head/camera video passes `p2-run.sh`; and
3. `source.json`, `audio.wav`, and `media-test.mp4` are present and usable in the persistent WSL project directory.

No P3 Whisper work starts before this gate is recorded.

## Development-side verification before publication

The P2 implementation was exercised before publication with local FFmpeg/ffprobe tooling using:

- a synthetic 640x360 H.264/AAC fixture;
- a portrait 360x640 ~29.97 fps fixture;
- 48 kHz and 44.1 kHz source audio;
- mono and stereo source audio;
- validation of 16 kHz mono PCM output;
- validation of the short MP4 A/V output;
- expected failure for video without audio;
- expected failure for invalid project IDs;
- expected refusal to overwrite an existing project without `--force`;
- shell syntax checks for all P2 scripts;
- mocked Docker invocation checks for the WSL wrappers, including a source path containing spaces.

The real phase gate still runs on the project's Debian Bookworm FFmpeg build inside the actual WSL container.

## Intentional limitations

P2 does not yet:

- transcribe speech;
- detect silence or filler words;
- use auto-editor/TightCut;
- call Bifrost;
- create edit plans;
- perform full-video editing;
- use hardware encoding;
- master audio loudness;
- preserve every source stream/track;
- implement a timeline/UI.

Only the first video and first audio stream are used in P2. Multi-track policy is deferred until a real requirement appears.
