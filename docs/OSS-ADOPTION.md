# Karve Open Source Adoption Strategy

Karve follows an explicit **adopt > adapt > build** rule.

Before implementing a new capability, first look for a mature, licensed upstream project, package, CLI, Skill, or repository that already solves it. Prefer using the capability as-is. Adapt only when normal integration is insufficient. Write custom code only when no suitable reusable implementation exists or Karve's required behavior is materially different.

For visual production, use the stricter order:

```text
Skill / existing capability
        -> pinned repo when direct source inspection is needed
        -> tiny adapter
        -> custom component for a measured important gap
        -> vendoring only after repeated need + license review
```

## Adoption rules

1. Search existing implementations before substantial new code.
2. Prefer maintained projects with real usage, clear documentation, reproducible setup, and an explicit license.
3. Prefer Skill/package/CLI/API integration over copying source.
4. When copying or adapting code, record repository, revision, license, and why normal integration was insufficient.
5. Never copy code from a repository without a clear license.
6. Pin direct versions/commits and record executable hashes where applicable.
7. Wrap third-party tools behind small Karve contracts so they can be upgraded or replaced.
8. Do not duplicate expensive stages. In particular, do not run a second ASR pipeline after Karve already has a transcript.
9. Validate Arabic/RTL behavior ourselves even when upstream claims multilingual support.
10. Keep phase gates authoritative; useful future tooling does not justify implementing future phases early.
11. Generated project-specific visual code is not automatically a reusable Karve primitive.
12. Promote a generated component into Karve core only after repeated observed reuse justifies ownership.

## Adoption map

| Capability | Project | Karve decision | Integration shape | Phase |
| --- | --- | --- | --- | --- |
| Media decode/encode/probe | FFmpeg / ffprobe | **Use directly** | System binaries inside container | P1-P2/P5+ |
| Local transcription | `SYSTRAN/faster-whisper` | **Use directly** | Python dependency behind adapter | P3 |
| JSON Schema validation | `ajv-validator/ajv-cli` | **Use directly** | Pinned `ajv-cli@5.0.0` in container | P4/P6/P7 |
| Forced alignment / diarization | `m-bain/whisperX` | **Deferred** | Add only after a measured alignment need | future |
| Rough-cut analysis | `WyattBlue/auto-editor` | **Use directly** | Pinned 31.5.0 CLI, stable v1 timeline | P5 |
| Filler/safe-cut patterns | `AndreaGiulianini/tightcut` | **Reference/adapt selectively** | No full pipeline and no duplicate Whisper | P5/future |
| Programmatic composition | `remotion-dev/remotion` | **Use directly** | Exact 4.0.520 packages + CLI | P6+ |
| Caption timing/pagination | `Fats403/remotion-captions-kit` | **Use headless utilities** | Exact 0.2.0 package behind Arabic wrapper | P6+ |
| Visual direction / shot recipes | `Vincentwei1021/video-talkcraft` | **Primary upstream capability** | Installed Codex Skill as-is first; pinned repo/source only when needed; no MCP required for Codex path | P7 |
| Shot/motion recipe reference | `Vincentwei1021/video-shotcraft` | **Reference selectively** | Use only for measured recipe gaps; do not bulk import | P7-P8 |
| Explainer pipeline/component patterns | `runesleo/claude-video-kit` | **Secondary reference / selective reuse** | Reuse only justified patterns/components; do not adopt TTS-first pipeline wholesale | P7-P8 |
| Transitions/integration patterns | `itsjwill/vanta` | **Reference/selectively reuse** | Import only individually justified modules | P7-P8/future |
| Shorts/MCP packaging | `gyoridavid/short-video-maker` | **Reference only initially** | Revisit only if packaging/API demand appears | future |
| LLM-driven editing experiment | `shangle/autocut` | **Conceptual reference only** | No copying without license/maturity evidence | P4-P5 research |
| Whisper + Remotion demo | `imtiaj-007/whisper-remotion` | **Reference only** | No copying without a clear license | P6 research |
| End-to-end faceless generation | MoneyPrinterTurbo / ShortGPT | **Not Karve core** | Revisit for generated assets only | future |
| Dubbing/localization | VideoLingo | **Not MVP** | Revisit if dubbing becomes a goal | future |

## Accepted integrations

### faster-whisper

Karve uses the upstream engine and model cache rather than implementing ASR. Karve adds only input/output contracts, persistence, profiles, and validation.

### Ajv CLI

Karve does not implement JSON Schema. Ajv validates structural contracts; Karve adds only domain invariants such as timeline bounds, evidence rules, and deterministic rebuild checks.

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

Karve adds a thin Arabic compatibility layer because upstream does not explicitly provide complete Arabic/RTL presentation behavior. The wrapper handles bidi isolation, Arabic punctuation during pagination, Noto typography, P5 timestamp mapping, and Karve style/safe areas. Upstream visual presets are not blindly adopted.

### video-talkcraft

P6-C proved the `video-talkcraft` Skill-first path on a real Karve technical segment.

Accepted P7 decision:

```text
Codex -> installed video-talkcraft Skill
```

Use the Skill's shot-design, visual-job, layout, motion-recipe, timing, and QA guidance without copying the full repository into Karve.

If an implementation mission needs direct source details that the installed Skill does not expose conveniently, inspect a pinned upstream checkout/revision. Prefer a tiny project-local adaptation of one selected recipe over importing the library wholesale.

No MCP layer is required for the current Codex path. MCP may be reconsidered only if another Karve model/agent needs structured read-only recipe access and the measured benefit justifies the extra layer.

The P6-C experiment also established a critical correctness rule: recipes provide visual vocabulary, not technical truth. Any exact feature/API/UI/code/metric shown by a P7 visual must be grounded in transcript or supplied evidence.

## P7 generated-code policy

Codex-generated visual code starts as project-local output.

Target order:

```text
existing Karve primitive
    -> video-talkcraft recipe / upstream capability
    -> tiny project-local adapter
    -> custom project-local component
```

Do not promote a one-off generated component into Karve core after one successful video. Promotion requires repeated reuse, a stable interface, tests, and a clear ownership/licensing decision.

## License gate

Open source or source availability does not automatically mean unrestricted embedding.

Before vendoring, copying, distributing, or commercial deployment:

- verify the license at the exact pinned revision;
- keep required notices;
- inspect bundled binary/model licenses separately from repository code;
- avoid unlicensed repositories;
- create `THIRD_PARTY_NOTICES.md` when Karve first vendors/adapts material code rather than consuming packages/Skills normally.

### Remotion note

Remotion is source-available under its own license rather than a standard MIT/Apache license. Re-check current terms before commercial deployment or product distribution.

### auto-editor note

The upstream repository uses the Unlicense/public-domain dedication. Official release binaries may bundle third-party components under separate licenses; audit them before redistributing the binary as part of a product.

### video-talkcraft note

The current project strategy is Skill-first use rather than vendoring. If Karve later copies/adapts material source from a pinned revision, verify and preserve the exact upstream license/notice requirements at that revision before promotion or distribution.

## Review checklist before custom implementation

- Does an existing project/Skill already solve this?
- Can Karve use it as-is before copying source?
- Is the exact version/revision maintained, documented, and licensed?
- Would integration duplicate an existing expensive stage?
- Can it be isolated behind a small adapter/contract?
- Does it genuinely support Arabic/RTL, or is a thin wrapper required?
- Is a new custom component solving a measured visual job rather than aesthetic novelty?
- Does the proposed visual have evidence for every exact technical claim?
- Is the feature part of the active phase?

If these questions were not checked, implementation should pause and research first.
