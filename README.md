# Karve

Karve is a local-first, AI-assisted video editing pipeline for turning raw talking-head videos, reels, shorts, and technical videos into professionally edited outputs.

The project is developed through explicit gates. Each phase must work on the real WSL/Docker host and pass user-facing quality review before it becomes accepted.

## Core principles

- Keep the Windows host clean; run the toolchain in WSL/Docker.
- Keep media, caches, models, and generated state outside disposable containers.
- Follow **adopt > adapt > build**: integrate mature upstream capabilities before writing equivalents.
- Let model/agent passes decide bounded semantic or visual intent; let Karve own truth, timing, validation, media assembly, and verification.
- Use Bifrost as the model API boundary for Karve LLM passes such as P4 and P6-B; P7 Codex runs as a bounded agent execution path, not as a replacement model router.
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
        P7 candidate segment
              |
              v
       bounded mission package
              |
              v
      Codex PLAN ONLY
      + video-talkcraft Skill
              |
              v
       visual-plan.json
      + grounding validation
              |
              v
     Codex IMPLEMENT + RENDER
              |
              v
   Karve-controlled assembly /
          verification
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
| Karve LLM API boundary | local Bifrost router |
| P4/P6-B quality model | `bedrock/qwen.qwen3-235b-a22b-2507-v1:0` |
| Structured validation | Ajv CLI + Karve semantic invariants |
| Compositor | `remotion 4.0.520` |
| Captions | `@remotion/captions 4.0.520` + `remotion-captions-kit 0.2.0` headless utilities |
| Browser | Google Chrome Stable inside the container |
| P6 style | versioned `karve-clean-v1` |
| P7 bounded agent | Codex CLI |
| P7 visual-direction vocabulary | installed `video-talkcraft` Skill, upstream-first |
| State | filesystem + versioned JSON |

## Phase status

- **P0 — Host baseline:** PASS.
- **P1 — WSL + container baseline:** PASS.
- **P2 — Media ingest:** PASS.
- **P3 — Arabic transcription:** PASS.
- **P4 — Structured edit planning:** PASS.
- **P5 — Rough cut:** PASS.
- **P6 — Arabic captions + standard motion:** PASS, including P6-B sparse correction/provenance and representative source/reel/real-p2 verification.
- **P7 — Technical explainers & Visual Director:** ACTIVE — architecture/contract gate.
- **P8 — QA and review:** blocked by P7.

See `docs/ROADMAP.md` and `docs/P7-TECHNICAL-EXPLAINERS.md`.

## Accepted P6 boundary

P6 maps captions and P4 standard visual intents through P5 `timeline-map.json`, then renders reusable behavior:

- Arabic RTL captions;
- active-word highlighting;
- `caption_emphasis` styling;
- bounded `punch_in` animation;
- title and callout cards;
- source, reel, and YouTube profiles;
- optional sparse display-only P6-B ASR correction with raw provenance;
- deterministic plan/schema/hash/media verification.

`transcript.json`, P4 semantic evidence, accepted media cuts, and `timeline-map.json` remain immutable.

P6-C was a bounded proof of concept, not canonical P6 behavior. On `tech-test-01` it proved that Karve can hand an already understood/timed segment to Codex, use the installed `video-talkcraft` Skill, create a plan first, implement only the approved scope, and produce a materially stronger visual explanation without rerunning earlier stages. That architecture is now promoted into P7.

## Current P7 boundary

P7 productizes the Visual Director workflow while keeping Karve in control of truth and final media behavior.

Initial order:

```text
P7-A  phase contract / production boundary
P7-B  mission.json contract
P7-C  visual-plan schema + grounding validator
P7-D  segment selection
P7-E  Codex plan runner
P7-F  Codex implementation runner
P7-G  generated component lifecycle
P7-H  Karve-controlled final assembly
P7-I  additional modes
P7-J  production acceptance
```

The first implementation work after the phase contract is **P7-B + P7-C**. Do not automate an unbounded Codex runner before Karve can generate and validate trustworthy mission and visual-plan artifacts.

Read `docs/P7-TECHNICAL-EXPLAINERS.md` before implementing P7.
