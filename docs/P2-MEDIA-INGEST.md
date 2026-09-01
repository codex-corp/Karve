# P2 — Media Ingest

## Status

**PASS — verified on the real WSL/Docker host on 2026-09-01**

P2 is closed. P3 is the active phase.

## Goal

Given a readable video with at least one video stream and one audio stream, Karve creates:

```text
~/karve-data/projects/<project-id>/
├── source.json
├── audio.wav
└── media-test.mp4
```

The source is mounted read-only into the disposable container and is not copied into the persistent project directory.

## Reuse decision

P2 uses FFmpeg + ffprobe directly. Karve adds only validation, normalized metadata, deterministic artifact layout, and verification wrappers.

## Verified real project

The representative real-video gate used `videos/test-video.mp4` and project `real-p2`.

Source metadata:

```text
duration:       36.041667 s
size:           15,240,959 bytes
video:          H.264 High, 1280x720, yuv420p, 24 fps
audio:          AAC, 48 kHz, stereo
```

Generated persistent artifacts:

```text
~/karve-data/projects/real-p2/
├── source.json
├── audio.wav
└── media-test.mp4
```

`audio.wav` was verified as PCM s16le, 16 kHz, mono. `media-test.mp4` was verified as a five-second H.264/AAC sample at 1280x720 with faststart.

## Gate results

Synthetic Docker/WSL verification:

```text
P2 ingest: PASS
P2 media ingest verification: PASS
```

Representative real video:

```text
P2 ingest: PASS
Project: real-p2
Output: /karve-data/projects/real-p2
```

All P2 acceptance criteria passed.

## Contract carried into P3

P3 consumes only the stable P2 artifacts it needs:

```text
source.json   -> source duration/media metadata
audio.wav     -> local speech-to-text input
```

P3 does not re-decode the original camera video just to transcribe it.

## Intentional P2 boundaries

P2 did not add transcription, silence/filler detection, auto-editor/TightCut, Bifrost, edit planning, full-video editing, hardware encoding, loudness mastering, Remotion, or a timeline UI.
