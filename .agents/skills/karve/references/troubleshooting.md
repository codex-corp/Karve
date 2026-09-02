# Karve troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| Bifrost `fetch failed` from container | Container cannot reach host loopback | Use the P4/P6-B compose overlay that enables the accepted host-network route; verify current compose/config instead of hardcoding a new provider path. |
| Missing `linger_ms` or `aligned_words` in default plan | Type mismatch in Remotion default plan | Ensure the current `Root.tsx` default plan includes fields required by the active P6 schema, such as `linger_ms` and `metrics.aligned_words`. |
| Duplicate raw word remains after N:1 correction | Raw word stream mapped instead of aligned display stream | Apply corrections first and call `mapAlignedWords()` on the aligned display stream. |
| N:M/1:N provenance appears duplicated | Uniqueness checked on raw source index | Allow display words to share a raw range; use display-word identity/index for uniqueness. |
| JSX parser error such as `Expected ">"` | JSX stored in `.ts` | Rename the component file to `.tsx` or move JSX into a `.tsx` module. |
| Host repeatedly jumps full/PiP/full/PiP | Beat-by-beat layout decisions are independent | Merge connected beats into one continuous visual scene; yield once and restore once. |
| Circular PiP crops microphone/body badly | Webcam source has no alpha and circular mask is too destructive | Prefer a rounded 16:9 PiP or another source-aspect-preserving frame. |
| Visual looks polished but says things not in the video | Semantic hallucination during diagram design | Remove unsupported labels/features; ground visuals in transcript/approved evidence or use neutral nodes. |
| Caption emphasis appears doubled/noisy | Karve caption emphasis + upstream caption effect both applied | Preserve canonical Karve caption layer and move any extra accent to a separate non-caption layer. |
| Transition points to empty/fake UI | No real next demo surface exists | Use a restrained handoff cue; only use a real transition when the next verified surface is available. |
| P6-C render moves captions with host PiP | Flattened baseline render used as host layer | Compose host/media and captions separately; keep canonical captions in a stable top layer. |
| Source/output visual timing drifts after P5 | Source timestamps used directly after cuts | Map every visual beat through `timeline-map.json`; only use 1:1 when verified. |

## Debugging discipline

1. Reproduce/inspect the smallest failing stage.
2. Verify input artifacts before changing code.
3. Check schema/type mismatch before changing media logic.
4. Make the smallest justified fix.
5. Run the phase-specific test/verify command.
6. Inspect the final diff and confirm accepted prior-phase artifacts were not mutated.
