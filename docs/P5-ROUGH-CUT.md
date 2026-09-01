# P5 — Rough Cut

## Status

**PASS**

P5 is closed on the real WSL/Docker host. Karve merged P4 semantic decisions with deterministic `auto-editor` analysis, generated an auditable source-to-output timeline, rendered real rough cuts through FFmpeg, and passed technical plus human audio/pacing review on the representative projects.

P5 does not render captions, zooms, cards, or other motion graphics. P6 consumes its rough cut and timeline map.

## Accepted architecture

```text
P4 edit-plan.json
        |
        +--> semantic remove/keep evidence
        |
P2 audio.wav
        |
        v
auto-editor 31.5.0
        |
        +--> deterministic silence proposals
        |
        v
Karve deterministic merge
        |
        +--> rough-cut-plan.json
        +--> timeline-map.json
        |
        v
FFmpeg 6.1
        |
        v
rough-cut.mp4
```

P4 is the semantic editor. `auto-editor` measures audio dead space. Karve resolves conflicts and applies safe margins. FFmpeg executes the final media timeline.

## OSS decision — auto-editor

Karve adopts `WyattBlue/auto-editor` directly rather than implementing a custom loudness/silence detector.

```text
version: 31.5.0
release artifact: auto-editor-linux-x86_64
sha256: 9c93cd57f8e29631355b96e97b081beddc95972119ceab43111656dd09a31dc5
license: Unlicense / public domain for the upstream repository
```

The official Linux release is built on Ubuntu 24.04. Karve therefore moved its final container runtime to Ubuntu 24.04 instead of compiling a private fork or downgrading the tool.

P5 consumes auto-editor's stable v1 linear timeline. Karve does not use auto-editor transcription; P3 faster-whisper remains the only ASR stage.

## Accepted merge policy

Versioned settings live in `config/p5-defaults.json`.

```text
auto-editor audio threshold:     0.04
auto-editor active margin:       0.12 s
minimum silence cut:             0.35 s
semantic boundary margin:        0.08 s
keep protection:                 0.08 s
minimum auto-only cut:           0.18 s
adjacent merge gap:              0.05 s
```

Rules:

1. P4 semantic remove ranges are normalized first.
2. Semantic boundaries are reduced by the safety margin so neighboring speech is not clipped.
3. P4 keep ranges protect meaningful speech from deterministic silence proposals.
4. Tiny auto-editor-only cuts are ignored.
5. Unspecified P4 regions remain kept unless auto-editor supplies an explicit measurable cut.
6. Final cuts preserve provenance (`semantic`, `auto_editor`) and reason codes.
7. P4 visual intents are carried forward as metadata but are not rendered in P5.

## Artifacts

```text
project/
├── auto-editor-silence.v1
├── rough-cut-plan.json
├── timeline-map.json
├── rough-cut.meta.json
└── rough-cut.mp4
```

`timeline-map.json` is authoritative for translating original source timestamps into the P5 output timeline. P6 uses it for every word and visual intent.

The original source, `source.json`, `transcript.json`, and `edit-plan.json` remain unchanged. P5 metadata records input hashes and the supplied source hash.

## Accepted runtime baseline

The post-migration real image passed:

```text
Ubuntu:             24.04.4 LTS
glibc:              2.39
Node:               22.23.2
auto-editor:        31.5.0
Python:             3.12.3
FFmpeg:             6.1.1-3ubuntu5
Google Chrome:      152.0.7977.75
faster-whisper:     1.2.1
CTranslate2:        4.8.2
UID/GID:            1000:1000
Arabic font:        Noto Sans Arabic
```

P1 persistence, P2 ingest, P3 imports, P4 validation, and P5 timeline regression tests all passed after the runtime migration.

## Real-host acceptance — 2026-09-02

### Aggressive cleanup — `real-p2`

```text
source duration:     ~36.04 s
rough-cut duration:  ~17.57 s
removed:             ~18.47 s
render time:         ~1.34 s
P5 verifier:         PASS
```

The rough cut removed the false starts and repeated attempts selected by P4 while preserving the later resolved speech.

### Conservative preservation — `sample-3-large`

```text
source duration:     25.704 s
planned output:      24.424 s
rendered output:     24.448 s
removed:             1.28 s
render time:         ~0.70 s
P5 verifier:         PASS
```

The only final cut was the P4 semantic silence range, reduced from `20.25s -> 21.69s` to `20.33s -> 21.61s` by the 80 ms safety margin. `auto-editor` added no extra cut for this conservative sample, which is valid: deterministic analysis is additive and does not override a sound semantic plan.

Frame, packet, duration, and decode inspection found no corruption or A/V timestamp gap. Human playback review confirmed the tested videos had natural audio, no clicks, no clipped words, and acceptable pacing.

## Final gate

- pinned auto-editor runs in the real image — **PASS**;
- previous-phase regression suite after Ubuntu migration — **PASS**;
- semantic + deterministic merge — **PASS**;
- source-to-output timeline mapping — **PASS**;
- real aggressive rough cut — **PASS**;
- real conservative rough cut — **PASS**;
- A/V sync and artifact integrity — **PASS**;
- human audio/cut-boundary review — **PASS ON CURRENT REPRESENTATIVE SAMPLES**.

The sample set is intentionally still small. Future real videos may justify profile tuning, but they do not reopen the accepted P5 architecture. P6 may proceed.
