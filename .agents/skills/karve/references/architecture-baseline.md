# Karve accepted architecture baseline

This is a **known-good snapshot**, not a replacement for repo configuration. Verify `AGENTS.md`, lockfiles, compose files, and phase docs before relying on exact versions.

## Runtime and storage

- WSL2 is the primary runtime.
- Docker Engine runs inside WSL; avoid global media/AI toolchain installs on Windows/WSL host.
- One container environment carries Node/pnpm, Python/uv, FFmpeg/ffprobe, Chromium dependencies, Arabic fonts, local ASR, Ajv, and Remotion tooling.
- Persistent data lives outside disposable containers, typically under `~/karve-data/`.

Typical persistent layout:

```text
~/karve-data/
├── projects/
├── cache/
├── models/
├── assets/
├── generated-components/
└── state/
```

A pinned external upstream checkout may live separately when needed; do not vendor it merely for discoverability.

## P3 ASR baseline

Known accepted baseline:

- `faster-whisper 1.2.1`
- `CTranslate2 4.8.2`
- quality/default: `large-v3`, CPU INT8
- fast: `turbo`, CPU INT8
- word timestamps + VAD
- persistent model cache
- WhisperX deferred

Treat ASR probabilities as soft evidence, not truth scores.

## P4 semantic planning baseline

- Bifrost is the LLM boundary for Karve semantic planning.
- Known quality model: `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`.
- Require structured output, JSON Schema/Ajv validation, and Karve semantic validation.
- Keep raw transcript separate from semantic interpretation.

Do not claim broad OpenAI compatibility for Bifrost beyond routes/features actually observed in the current deployment.

## P5 rough-cut baseline

- `auto-editor 31.5.0` pinned baseline.
- Karve consumes a stable timeline export, protects semantic keeps, and emits a source-to-output `timeline-map.json`.
- Render rough cuts deterministically with FFmpeg.

Do not let auto-editor perform a competing transcription pass.

## P6 baseline

Known pins:

```text
remotion                 4.0.520
@remotion/cli            4.0.520
@remotion/captions       4.0.520
remotion-captions-kit    0.2.0
```

Karve owns the thin Arabic RTL, safe-area, timeline mapping, presentation-plan, and style layer.

P6-B permits one bounded sparse display-correction pass before deterministic planning/rendering.

## P6-C visual direction

P6-C is an isolated proof/productization path:

```text
Karve accepted artifacts
        ↓
bounded Codex mission
        ↓
installed video-talkcraft Skill
        ↓
visual-plan.json
        ↓
experiment-local Remotion implementation
        ↓
review render + report
```

No MCP layer is required for the Codex -> video-talkcraft path.

If a future Bifrost/Qwen workflow needs runtime access to the same upstream recipe knowledge, evaluate a read-mostly MCP adapter separately. Do not add it preemptively.

## Data/infrastructure baseline

- Filesystem + JSON + hashes first.
- No DB/Redis in the baseline.
- If persistence/query needs grow, consider SQLite before Postgres/Redis.
- TypeScript orchestrates the pipeline; Python is limited to transcription/supporting tasks rather than a microservice layer.
