# Karve Open Source Adoption Strategy

Karve follows an explicit **adopt > adapt > build** rule.

Before implementing a new capability, first look for a mature, permissively licensed open-source project or library that already solves the problem. Prefer integrating through a stable CLI, package, or API. Adapt/fork only when integration is insufficient. Build custom code only when no suitable reusable implementation exists or when Karve-specific behavior is materially different.

## Adoption rules

For every meaningful new capability:

1. Search existing open-source implementations first.
2. Prefer actively maintained projects with real usage, clear documentation, reproducible setup, and a permissive license.
3. Prefer dependency/CLI/API integration over copying source code.
4. If source code is copied or adapted, record the upstream repository, version/commit, license, and the reason a normal dependency was insufficient.
5. Do not copy code from repositories without a clear license.
6. Pin versions/commits for reproducibility.
7. Wrap third-party tools behind small Karve adapters so they can be upgraded or replaced without changing the pipeline contract.
8. Avoid running two tools that duplicate the same expensive stage. Example: if Karve already has a transcript, do not invoke another project merely to re-run Whisper; reuse only the useful cutting/analysis logic.
9. Validate Arabic/RTL behavior ourselves even when the upstream project claims multilingual support.
10. Keep the phase gates authoritative: discovering a useful tool does not justify implementing a future phase early.

## Initial adoption map

| Capability | Project | Karve decision | Integration shape | Target phase |
| --- | --- | --- | --- | --- |
| Media decode/encode/probe | FFmpeg / ffprobe | **Use directly** | System binary inside project container | P1-P2 |
| Programmatic rendering / motion graphics | Remotion | **Use directly** | npm dependencies + Karve compositions | P1/P6+ |
| Local transcription | `SYSTRAN/faster-whisper` | **Use directly** | Python dependency behind transcription adapter | P3 |
| JSON Schema validation | `ajv-validator/ajv-cli` | **Use directly** | Pinned container CLI (`ajv-cli@5.0.0`) for deterministic P4 artifact validation | P4 |
| Forced alignment / diarization | `m-bain/whisperX` | **Deferred optional dependency** | Add only if measured timing/diarization needs justify it | after P3 |
| Automatic rough-cut / dead-space timeline | `WyattBlue/auto-editor` | **Use directly** | Pinned CLI; consume its stable v1 linear timeline as deterministic silence input | P5 |
| Filler-word / silence cutting patterns | `AndreaGiulianini/tightcut` | **Adapt selected logic, not full duplicate pipeline** | Reuse/adapt filler detection, cut margins, cache/smart-cut ideas after reviewing code/license | P3-P5 |
| Animated caption primitives/styles | `Fats403/remotion-captions-kit` | **Use as dependency if Arabic spike passes** | npm package wrapped by Karve RTL caption layer | P6 |
| Explainer pipeline patterns | `runesleo/claude-video-kit` | **Reuse selected MIT patterns/components** | Borrow doctor/review-gate/composition ideas; do not adopt its TTS-first pipeline wholesale | P7-P8 |
| Transitions / AI-video integration patterns | `itsjwill/vanta` | **Reference and selectively reuse** | Mine tested MIT components/integration patterns only; avoid importing the full broad stack | P6-P8/future |
| Shorts generation/MCP packaging patterns | `gyoridavid/short-video-maker` | **Reference only initially** | Learn from packaging/API/MCP patterns if needed | future |
| LLM-driven editing experiment | `shangle/autocut` | **Conceptual reference only** | Do not copy while repository has no clear license / maturity signal | P4-P5 research |
| Whisper + Remotion demo app | `imtiaj-007/whisper-remotion` | **Reference only** | No code copying without a clear license | P6 research |
| End-to-end faceless generation | MoneyPrinterTurbo / ShortGPT | **Not core to Karve** | Revisit only for future generated B-roll/assets | future |
| Dubbing/localization | VideoLingo | **Not MVP** | Revisit only if multilingual dubbing becomes a goal | future |

## Why these choices

### Ajv CLI

P4 needs strict, reproducible JSON Schema validation. Karve does not implement its own JSON Schema engine. The disposable image pins `ajv-cli@5.0.0` and uses its JSON Schema 2020-12 validation path. Karve adds only domain-specific semantic invariants that JSON Schema does not express conveniently, such as timeline bounds and contradictory keep/remove ranges.

### auto-editor

Karve should not invent a silence/motion rough-cut engine before testing `auto-editor`. It already provides mature automatic editing, configurable margins, multiple detection methods, editor exports, and JSON timeline formats. P5 pins the upstream CLI and consumes its stable v1 linear timeline only for deterministic silence proposals; Karve then merges those proposals with P4 semantics and keeps FFmpeg as the media executor.

### tightcut

`tightcut` is intentionally small and demonstrates useful behavior for talking-head footage: faster-whisper word timestamps, silence/filler detection, dry-run, caching, safe padding, and smart cutting. Karve should avoid invoking its full pipeline after Karve already has a transcript; the useful pieces are the algorithms and edge-case handling.

### remotion-captions-kit

Use it for pagination/timing/style primitives rather than rebuilding every short-form caption animation. Karve still owns an RTL/Arabic wrapper and must test shaping, punctuation, line direction, safe-area placement, and active-word highlighting.

### claude-video-kit

Its problem is different (script/TTS -> explainer rather than source-video editing), but its one-command pipeline, `doctor`, pre-render review gate, script-bound metadata, and reusable `cover`/`text`/`code` composition model are directly relevant to Karve's P7/P8 design.

### Vanta

Vanta is broad enough that importing it wholesale would work against Karve's simplicity rule. Treat it as a source of reusable, audited component ideas: transitions, caption integration, asset adapters, and local service boundaries. Reuse only individually justified modules.

## License gate

Open source does not automatically mean unrestricted embedding.

Before vendoring or copying any implementation:

- verify the exact repository/package license at the pinned revision;
- keep required copyright/license notices;
- check licenses of bundled models/weights separately from code;
- avoid unlicensed repositories entirely;
- record material third-party code in a future `THIRD_PARTY_NOTICES.md` when the first vendored/adapted code is introduced.

### Remotion note

Remotion is source-available under its own license rather than a standard MIT/Apache license. Individuals, qualifying small organizations, and evaluation use may be eligible for its free license; other for-profit organizations may require a Company License. Before Karve is deployed commercially or distributed as a product, re-check the then-current Remotion terms.

## Review checklist before custom implementation

Before an agent writes a substantial new module, answer:

- Is there an existing project that already does this?
- Can we call it as a CLI/package/API instead of copying it?
- Is it maintained and tested enough for our use?
- Is the license compatible?
- Does using it duplicate an expensive stage we already run?
- Can it be isolated behind an adapter?
- Does it support Arabic/RTL, or can we add a thin compatibility layer?
- Is custom implementation actually smaller and safer than integration?

If these questions were not checked, implementation should pause and research first.
