# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is developed through explicit gates. Each phase must work on the real WSL/Docker host and pass a user-facing quality review before the next phase becomes active.

## Core principles

- Keep the Windows host clean; run the toolchain in WSL/Docker.
- Keep media, caches, models, and generated state outside disposable containers.
- Follow **adopt > adapt > build**: integrate mature OSS before writing equivalents.
- Let LLMs decide semantic intent; let deterministic code execute media operations.
- Use Bifrost as the LLM boundary; do not duplicate Bedrock integration.
- Keep CPU execution supported; GPU acceleration is optional.
- Treat Arabic as a first-class target.
- Avoid databases, queues, workers, and microservices until a measured need exists.
- Treat technical PASS and product-quality PASS as separate gates.

## Runtime boundary

```text
Windows 11
  -> WSL2 / Ubuntu
     -> Docker Engine + Compose
        -> Karve container (Ubuntu 24.04)
```

Persistent state:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
├── generated-components/
└── state/
```

## Pipeline

```text
Source video
    |
    v
FFmpeg / ffprobe
    +--> source.json
    +--> audio.wav
    |
    v
faster-whisper
    |
    v
transcript.json
    |
    +--------------------+
    |                    |
    v                    v
auto-editor          Bifrost LLM
silence analysis     semantic edit planning
    |                    |
    +---------+----------+
              |
              v
         edit-plan.json
              |
              v
     Karve merge + FFmpeg
              |
     +--------+---------+
     |                  |
rough-cut.mp4     timeline-map.json
     |                  |
     +--------+---------+
              |
              +--> optional P6-B Bifrost sparse ASR display correction
              |        -> caption-corrections.json
              |
              v
 Remotion + caption primitives
              |
              v
        P6 styled draft
              |
       custom explainer?
          |          |
         no         yes
          |          |
          |      P7 templates /
          |      Codex fallback
          +----------+
              |
              v
           final MP4
```

## Technology choices

| Concern | Choice |
| --- | --- |
| Host | Windows 11 + WSL2 |
| Runtime | Docker Engine + Compose inside WSL |
| Container base | Ubuntu 24.04 |
| Media | FFmpeg / ffprobe |
| Rough-cut analysis | pinned `auto-editor 31.5.0` v1 timeline |
| Transcription quality | `large-v3` / CPU INT8 |
| Transcription fast | `turbo` / CPU INT8 |
| Model storage | persistent `~/karve-data/models/whisper` |
| LLM boundary | local Bifrost router |
| P4/P6-B quality model | `bedrock/qwen.qwen3-235b-a22b-2507-v1:0` |
| Structured validation | Ajv CLI + Karve semantic invariants |
| P6 compositor | `remotion 4.0.520` |
| P6 captions | `@remotion/captions 4.0.520` + `remotion-captions-kit 0.2.0` headless utilities |
| Browser | Google Chrome Stable inside the container |
| P6 style | versioned `karve-clean-v1` |
| Coding/motion fallback | Codex CLI in P7 only when reusable components are insufficient |
| State | filesystem + versioned JSON |

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS.
- **P2 — Media ingest:** PASS.
- **P3 — Arabic transcription:** PASS.
- **P4 — Structured edit planning:** PASS.
- **P5 — Rough cut:** PASS on aggressive and conservative real samples, including human audio review.
- **P6 — Arabic captions + standard motion:** ACTIVE; source/reel rendering has passed the current caption baseline, while the broader visual-quality gate remains open.
- **P7 — Technical explainers:** blocked by P6.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and the active phase document.

## Accepted P5 result

P5 proved the complete deterministic edit path:

```text
P4 semantics + auto-editor proposals
              -> Karve conflict/safety merge
              -> rough-cut-plan.json
              -> timeline-map.json
              -> FFmpeg rough-cut.mp4
```

`real-p2` was reduced from about 36.04 seconds to 17.57 seconds by removing false starts and dead space. `sample-3-large` was conservatively reduced from 25.70 seconds to about 24.45 seconds through one safe 1.28-second semantic silence cut. Both outputs passed structural verification and human playback review without clicks, clipped words, or unacceptable pacing.

## Current P6 boundary

P6 maps every caption word and P4 visual intent through P5 `timeline-map.json`, then renders only standard reusable behavior:

- Arabic RTL captions;
- active-word highlighting;
- `caption_emphasis` styling;
- bounded `punch_in` animation;
- title and callout cards;
- source, reel, and YouTube profiles.

P6-B may optionally call Bifrost once to create sparse, display-only ASR corrections. `transcript.json` and P4 intent text remain immutable; corrected caption words and ASR-derived title/callout presentation are stored only in P6 artifacts. After `caption-corrections.json` exists, P6 planning and rendering are deterministic. `explainer` intent remains preserved for P7, and P6 does not invoke Codex.

Initial host gate:

```bash
git pull --ff-only
bash scripts/bootstrap.sh
bash scripts/p6-logic-test.sh

bash scripts/p6-run.sh sample-3-large --profile source --plan-only
bash scripts/p6-run.sh sample-3-large --profile source --force
bash scripts/p6-verify.sh sample-3-large source

bash scripts/p6-run.sh sample-3-large --profile reel --force
bash scripts/p6-verify.sh sample-3-large reel
```

Read `docs/P6-CAPTIONS-MOTION.md` before accepting visual quality or starting P7.
