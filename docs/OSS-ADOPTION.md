# Karve Open Source Adoption Strategy

Karve follows an explicit **adopt > adapt > build** rule.

Before implementing a new capability, first look for a mature, permissively licensed open-source project or library that already solves it. Prefer integration through a stable CLI, package, or API. Adapt/fork only when normal integration is insufficient. Write custom code only when no suitable reusable implementation exists or Karve's required behavior is materially different.

## Adoption rules

1. Search existing implementations before substantial new code.
2. Prefer maintained projects with real usage, clear documentation, reproducible setup, and an explicit license.
3. Prefer dependency/CLI/API integration over copying source.
4. When copying or adapting code, record repository, revision, license, and why normal integration was insufficient.
5. Never copy code from a repository without a clear license.
6. Pin direct versions/commits and record executable hashes where applicable.
7. Wrap third-party tools behind small Karve contracts so they can be upgraded or replaced.
8. Do not duplicate expensive stages. In particular, do not run a second ASR pipeline after Karve already has a transcript.
9. Validate Arabic/RTL behavior ourselves even when upstream claims multilingual support.
10. Keep phase gates authoritative; useful future tooling does not justify implementing future phases early.

## Adoption map

| Capability | Project | Karve decision | Integration shape | Phase |
| --- | --- | --- | --- | --- |
| Media decode/encode/probe | FFmpeg / ffprobe | **Use directly** | System binaries inside container | P1-P2/P5 |
| Local transcription | `SYSTRAN/faster-whisper` | **Use directly** | Python dependency behind adapter | P3 |
| JSON Schema validation | `ajv-validator/ajv-cli` | **Use directly** | Pinned `ajv-cli@5.0.0` in container | P4/P6 |
| Forced alignment / diarization | `m-bain/whisperX` | **Deferred** | Add only after a measured alignment need | future |
| Rough-cut analysis | `WyattBlue/auto-editor` | **Use directly** | Pinned 31.5.0 CLI, stable v1 timeline | P5 |
| Filler/safe-cut patterns | `AndreaGiulianini/tightcut` | **Reference/adapt selectively** | No full pipeline and no duplicate Whisper | P5/future |
| Programmatic composition | `remotion-dev/remotion` | **Use directly** | Exact 4.0.520 packages + CLI | P6+ |
| Caption timing/pagination | `Fats403/remotion-captions-kit` | **Use headless utilities** | Exact 0.2.0 package behind Arabic wrapper | P6 |
| Explainer pipeline patterns | `runesleo/claude-video-kit` | **Reuse selected patterns/components** | Do not adopt TTS-first pipeline wholesale | P7-P8 |
| Transitions/integration patterns | `itsjwill/vanta` | **Reference and selectively reuse** | Import only individually justified modules | P6-P8/future |
| Shorts/MCP packaging | `gyoridavid/short-video-maker` | **Reference only initially** | Revisit only if packaging/API demand appears | future |
| LLM-driven editing experiment | `shangle/autocut` | **Conceptual reference only** | No copying without license/maturity evidence | P4-P5 research |
| Whisper + Remotion demo | `imtiaj-007/whisper-remotion` | **Reference only** | No copying without a clear license | P6 research |
| End-to-end faceless generation | MoneyPrinterTurbo / ShortGPT | **Not Karve core** | Revisit for generated assets only | future |
| Dubbing/localization | VideoLingo | **Not MVP** | Revisit if dubbing becomes a goal | future |

## Accepted integrations

### faster-whisper

Karve uses the upstream engine and model cache rather than implementing ASR. Karve adds only input/output contracts, persistence, profiles, and validation.

### Ajv CLI

Karve does not implement JSON Schema. Ajv validates structural contracts; Karve adds only domain invariants such as timeline bounds and deterministic rebuild checks.

### auto-editor

Karve uses pinned `auto-editor 31.5.0` for audio dead-space proposals and consumes its stable v1 linear timeline. Karve does not use its transcription path. P4 semantics and P5 deterministic proposals are merged by a small auditable Karve layer, then rendered by FFmpeg.

### Remotion

Karve uses exact Remotion 4.0.520 packages and the official CLI for composition/rendering. P6 uses JSON props, public assets, an explicit Chrome executable, and `OffthreadVideo`. Karve does not build a private browser renderer.

### remotion-captions-kit

P6 adopts only the reusable caption primitives:

- word-to-caption conversion;
- duration/silence/character-aware pagination;
- timeline sequences;
- active-token state.

Karve adds a thin Arabic compatibility layer because upstream does not explicitly provide complete Arabic/RTL presentation behavior. The wrapper handles bidi isolation, Arabic punctuation during pagination, Noto typography, P5 timestamp mapping, and the Karve visual style. The upstream visual presets are not blindly adopted.

## License gate

Open source does not automatically mean unrestricted embedding.

Before vendoring, copying, distributing, or commercial deployment:

- verify the license at the exact pinned revision;
- keep required notices;
- inspect bundled binary/model licenses separately from repository code;
- avoid unlicensed repositories;
- create `THIRD_PARTY_NOTICES.md` when Karve first vendors/adapts material code rather than consuming packages normally.

### Remotion note

Remotion is source-available under its own license rather than a standard MIT/Apache license. Individual, qualifying small-organization, nonprofit, and evaluation use may be free; other for-profit use may require a Company License. Re-check current terms before commercial deployment or product distribution.

### auto-editor note

The upstream repository uses the Unlicense/public-domain dedication. Official release binaries may bundle third-party components under separate licenses; audit them before redistributing the binary as part of a product.

## Review checklist before custom implementation

- Does an existing project already solve this?
- Can Karve call it through a CLI/package/API instead of copying it?
- Is the exact version maintained, documented, and licensed?
- Would integration duplicate an existing expensive stage?
- Can it be isolated behind a small adapter?
- Does it genuinely support Arabic/RTL, or is a thin wrapper required?
- Is custom implementation actually smaller and safer?
- Is the feature part of the active phase?

If these questions were not checked, implementation should pause and research first.
