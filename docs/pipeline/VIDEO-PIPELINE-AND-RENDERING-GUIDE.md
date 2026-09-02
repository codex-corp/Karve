# Karve Video Pipeline & Rendering Architecture Guide

## 1. Executive Summary & Pipeline Overview

Karve is a local-first, deterministic AI-driven video intelligence and rendering engine designed for Arabic and multi-language content. It operates through strict, gated phases where every transformation produces an immutable JSON artifact before progressing to the next stage.

```text
Raw Source Video (.mp4 / .mkv / .mov)
  │
  ├─► P2: Ingest ──────────────► source.json + audio.wav
  │
  ├─► P3: Transcription ──────► transcript.json (faster-whisper large-v3)
  │
  ├─► P4: Semantic Planning ──► edit-plan.json (Local Bifrost LLM gateway)
  │
  ├─► P5: Rough Cut ──────────► rough-cut.mp4 + rough-cut-plan.json + timeline-map.json
  │
  ├─► P6-B: Caption Correction► caption-corrections.json (Sparse ASR display layer)
  │
  ├─► P6: Presentation & Render► p6-<profile>.plan.json + p6-<profile>.mp4 + meta
  │
  └─► P6-C: Visual Direction ─► visual-plan.json + isolated Remotion composition
```

---

## 2. Detailed Phase Breakdown & Execution Commands

### Phase 2: Ingest (`p2-run.sh`)
* **Goal:** Extract clean 16kHz mono PCM audio (`audio.wav`), probe full container/stream metadata (fps, pixel format, dimensions, audio layout), and establish the project directory.
* **Command:**
  ```bash
  bash scripts/p2-run.sh <path-to-video.mp4> --project <project-id> [--force]
  ```
* **Artifact Produced:**
  - `source.json`: Video resolution, duration, framerate, stream tags, container format.
  - `audio.wav`: 16-bit mono 16000Hz PCM stream extracted via FFmpeg.

---

### Phase 3: Transcription (`p3-run.sh`)
* **Goal:** Generate word-level timestamps and segment transcriptions using local CPU INT8 quantized Faster-Whisper.
* **Engine Baseline:** Faster-Whisper `1.2.1` / CTranslate2 `4.8.2` (`large-v3` default, `turbo` fast profile).
* **Command:**
  ```bash
  bash scripts/p3-run.sh <project-id> --language ar --model large-v3 [--force]
  ```
* **Artifact Produced:**
  - `transcript.json`: Contains full text, segment array with `start`, `end`, and per-word timestamps (`start`, `end`, `probability`).
* **Critical Invariant:** `transcript.json` represents raw ground-truth evidence and remains **strictly immutable** throughout all subsequent stages.

---

### Phase 4: Semantic Edit Planning (`p4-run.sh`)
* **Goal:** Analyze the transcript through a local LLM boundary (Bifrost Gateway with `Qwen 235B`) using strict JSON Schema validation.
* **Command:**
  ```bash
  bash scripts/p4-run.sh <project-id> [--profile quality|fast] [--force]
  ```
* **Artifact Produced:**
  - `edit-plan.json`: List of editorial decisions (`keep`, `remove`) with semantic justifications and categorized visual intents (`title`, `callout`, `punch_in`, `caption_emphasis`, `explainer`).

---

### Phase 5: Deterministic Rough Cut (`p5-run.sh`)
* **Goal:** Combine P4 editorial decisions with Auto-Editor silence detection and apply keep protection margins (300ms pre/post pads) to render the cut video without re-encoding audio.
* **Command:**
  ```bash
  bash scripts/p5-run.sh <project-id> <path-to-source-video.mp4> [--force]
  ```
* **Artifacts Produced:**
  - `rough-cut.mp4`: The assembled video with dead air and rejected takes removed.
  - `rough-cut-plan.json`: Precise cut boundaries and carried visual intents.
  - `timeline-map.json`: Frame-accurate mapping array translating source time coordinates to output rough-cut coordinates:
    $$\text{output\_start} = \text{segment.output\_start} + (\text{source\_start} - \text{segment.source\_start})$$

---

### Phase 6-B: Sparse ASR Caption Correction (`p6-correct.sh`)
* **Goal:** Correct Whisper phonetic recognition errors (e.g. `مفترب` ➔ `مغترب`) on the presentation layer without altering the spoken words, colloquial phrasing, or raw transcript.
* **Engine:** Local Bifrost gateway calling Qwen 235B with JSON Schema validation.
* **Command:**
  ```bash
  bash scripts/p6-correct.sh <project-id> [--force]
  ```
* **Artifact Produced:**
  - `caption-corrections.json`: Sparse array of token replacements (`1:1`, `1:N`, `N:1`, `N:M`) with `source_word_start`, `source_word_end`, `original_text`, `replacement`, `reason`, and `confidence`.

---

### Phase 6: Presentation Planning & Baseline Remotion Render (`p6-run.sh`)
* **Goal:** Remap words and visual intents through `timeline-map.json`, apply RTL shaping, safe-area layout, active word highlighting, and render the styled video deterministically via Remotion.
* **Profiles:** `source` (matches raw video framing), `reel` (1080x1920 vertical with background blur & subject contain), `youtube` (1920x1080 horizontal).
* **Command:**
  ```bash
  bash scripts/p6-run.sh <project-id> --profile source|reel|youtube [--force]
  bash scripts/p6-verify.sh <project-id> source|reel|youtube
  ```
* **Artifacts Produced:**
  - `p6-<profile>.plan.json`: Complete Remotion input plan with canvas, media layout, mapped caption words (including `display_text` and `raw_text`), visual intents, and metrics.
  - `p6-<profile>.mp4`: The final rendered MP4 video.
  - `p6-<profile>.meta.json`: Cryptographic manifest containing SHA256 hashes of all input artifacts (`rough-cut.mp4`, `source.json`, `transcript.json`, `timeline-map.json`, `caption-corrections.json`, `p6-profiles.json`) and output specifications.

---

### Phase 6-C: Bounded Visual Director (Codex / Video-Talkcraft)
* **Goal:** Hand an already-timed segment (15–30s) to a Visual Director agent to produce enhanced explanatory motion and diagrams using `video-talkcraft` without touching canonical pipeline code.
* **Contract & Isolation:**
  - Plan: `experiments/<project-id>/visual-plan.json`
  - Composition: `experiments/<project-id>/P6CComposition.tsx`
  - Output: `experiments/<project-id>/p6c-visual-<profile>.mp4`
  - Report: `experiments/<project-id>/implementation-report.md`

---

## 3. Core Technical Invariants & Quality Rules

1. **Deterministic Word Stream Flow:**
   $$\text{raw transcript} \xrightarrow{\text{applyCorrections()}} \text{aligned stream} \xrightarrow{\text{mapAlignedWords()}} \text{timeline-map} \xrightarrow{} \text{Remotion captions}$$
2. **Safe Area Compliance:** Captions must reside in the bottom 25% of the screen with proper padding, RTL text direction (`dir="rtl"`), and inline sequence bounding to prevent ghost captions during pauses.
3. **Reproducibility & Verification:** No phase is considered complete without passing automated schema validation, hash matching, and type checking (`tsc --noEmit`).
