# Karve Artifact Catalog & Schema Dictionary

All project data is stored in the persistent volume under `/karve-data/projects/<project-id>/`. Every artifact is strictly validated against JSON Schemas in `schemas/`.

---

## 1. Complete Artifact Matrix

| Artifact Filename | Producer Phase | Consumer Phase(s) | Primary Purpose | Immutability Status |
|---|---|---|---|---|
| `source.json` | P2 (Ingest) | P3, P4, P5, P6 | Raw media container & stream metadata | **Strictly Immutable** |
| `audio.wav` | P2 (Ingest) | P3, P5 | 16kHz mono PCM audio for transcription & cuts | **Strictly Immutable** |
| `transcript.json` | P3 (ASR) | P4, P6, P6-B | Word-level timestamps & spoken text | **Strictly Immutable** |
| `edit-plan.json` | P4 (Semantic) | P5, P6 | Editorial decisions & semantic visual intents | **Strictly Immutable** |
| `rough-cut-plan.json` | P5 (Rough Cut) | P5, P6 | Cut boundaries & carried visual intents | **Strictly Immutable** |
| `rough-cut.mp4` | P5 (Rough Cut) | P6 (Render) | Merged audio/video without dead air | **Strictly Immutable** |
| `timeline-map.json` | P5 (Rough Cut) | P6, P6-B | Coordinate translation: source $\to$ output | **Strictly Immutable** |
| `caption-corrections.json` | P6-B (ASR Fix) | P6 (Presentation) | Presentation-layer display text overrides | **Read-Only in P6** |
| `p6-<profile>.plan.json` | P6 (Plan) | P6 (Remotion) | Full Remotion composition props | Regenerable per run |
| `p6-<profile>.mp4` | P6 (Render) | User / Release | Final styled video output | Target Render |
| `p6-<profile>.meta.json` | P6 (Verify) | Audit / CI | SHA256 cryptographic provenance manifest | Sealed Manifest |

---

## 2. Artifact Details & Example Payloads

### `source.json`
* **Schema:** `schemas/source.schema.json`
* **Key Fields:** `width`, `height`, `fps`, `duration_seconds`, `pixel_format`, `audio_sample_rate`, `audio_channels`.

### `transcript.json`
* **Schema:** `schemas/transcript.schema.json`
* **Key Fields:**
  ```json
  {
    "language": "ar",
    "duration": 32.1,
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 4.9,
        "text": "أطيب تحياتي وأهلاً وسهلاً بكم.",
        "words": [
          { "word": "أطيب", "start": 0.0, "end": 0.42, "probability": 0.95 }
        ]
      }
    ]
  }
  ```

### `timeline-map.json`
* **Schema:** `schemas/timeline-map.schema.json`
* **Key Fields:** Maps continuous source segments to output time after silence cuts:
  ```json
  [
    { "source_start": 0.0, "source_end": 32.1, "output_start": 0.0, "output_end": 32.1 }
  ]
  ```

### `caption-corrections.json`
* **Schema:** `schemas/caption-corrections.schema.json`
* **Key Fields:**
  ```json
  {
    "corrections": [
      {
        "source_word_start": 30,
        "source_word_end": 31,
        "original_text": "أبو سرابك",
        "replacement": "أبو سُرّك",
        "reason": "Phonetic Whisper ASR correction",
        "confidence": 0.98
      }
    ]
  }
  ```

### `p6-<profile>.meta.json`
* **Schema:** `schemas/p6-meta.schema.json`
* **Key Fields:** Records input hashes to guarantee deterministic reproducibility:
  ```json
  {
    "hashes": {
      "rough_cut_sha256": "3a8f...",
      "transcript_sha256": "9b12...",
      "timeline_map_sha256": "4c71..."
    }
  }
  ```
