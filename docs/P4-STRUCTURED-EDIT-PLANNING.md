# P4 — Structured Edit Planning

## Status

**PASS**

P4 is closed on the real WSL/Docker host. Karve successfully produced schema-valid, semantically useful edit plans through the existing local Bifrost gateway and AWS Bedrock Qwen 235B route.

P4 does not cut or render video. P5 consumes the validated semantic plan.

## Accepted boundary

```text
Karve container
  -> Bifrost on WSL localhost
  -> AWS Bedrock
  -> Qwen 235B
  -> strict structured edit plan
```

Live application-facing contract:

```text
base URL:              http://127.0.0.1:10020
health:                GET /health
models:                GET /v1/models
chat:                  POST /v1/chat/completions
local auth:            none currently required
optional auth shape:   Authorization: Bearer <token>
```

Karve does not add a direct Bedrock SDK path and does not modify the live Bifrost configuration.

The exact installed Bifrost version/commit was not captured in the reported final gate. The runtime behavior itself was verified end-to-end, and Karve only depends on the small API surface above, so the missing version string is recorded as a reproducibility follow-up rather than a functional blocker.

## Model policy

Gemini is intentionally not used by the current P4 default path because its credits are being conserved.

Accepted Quality/default model:

```text
bedrock/qwen.qwen3-235b-a22b-2507-v1:0
```

The original Fast candidate:

```text
bedrock/apac.amazon.nova-2-lite-v1:0
```

returned AWS 400 on the real account. Based on the supplied live model inventory, the Fast candidate is corrected to:

```text
bedrock/apac.amazon.nova-lite-v1:0
```

This optional Fast profile is **UNVERIFIED AFTER ID CORRECTION**. It is not part of the P4 acceptance basis and does not block P5.

## Structured output

The accepted Qwen route supports:

```text
response_format.type = json_schema
strict = true
```

Karve still validates the returned object locally. There is no prose parsing, Markdown fence stripping, or best-effort extraction.

## Deterministic validation

P4 uses the pinned `ajv-cli@5.0.0` inside the disposable image for JSON Schema validation, then applies Karve-specific semantic invariants:

- every range must satisfy `start < end` and stay within source duration;
- referenced transcript segment IDs must exist;
- `uncertain_asr` cannot by itself justify a destructive remove;
- contradictory keep/remove ranges are rejected;
- overlapping remove ranges are rejected;
- visual intents cannot target content removed by the same plan;
- `project_id` and source duration are pinned to deterministic source artifacts rather than trusted from the model.

The raw `transcript.json` is preserved unchanged.

## ASR confidence rule

Word probabilities are passed as soft evidence. They are not accuracy scores and are never a hard threshold for deletion. Dialect, names, and technical terms may be wrong even at moderate confidence.

## Real-host acceptance — 2026-09-01

### `sample-3-large`

```text
P4 edit-plan verification: PASS
Keep decisions:   7
Remove decisions: 1
Visual intents:   3
```

Manual semantic review accepted the plan:

- the emotional narrative was preserved;
- only the meaningful silence gap from about `20.25s` to `21.69s` was removed;
- `caption_emphasis` was suggested for `شعور لا يوصف`;
- a `callout` was suggested around the local/Aleppine phrase;
- a selective `punch_in` was suggested for `اشتقنا لكم`.

This was judged relevant rather than generic or over-edited.

### `real-p2`

```text
P4 edit-plan verification: PASS
Keep decisions:   2
Remove decisions: 2
Visual intents:   2
```

The planner correctly treated the early fragmented/repeated speech as false starts and preserved the later resolved speech. The two semantic removals covered approximately:

```text
1.65  -> 12.60
12.60 -> 20.28
```

The plan then kept the clearer statement around `20.28s -> 23.62s` and the later closing instruction around `33.16s -> 35.72s`, while proposing a punch-in and a callout only where they were contextually justified.

P4 is intentionally semantic, not an exhaustive silence cutter. Any remaining dead space or unspecified timeline regions are resolved explicitly by P5's deterministic rough-cut merge rather than assumed removed.

## Performance

One accepted real Qwen quality request reported:

```text
structured mode: json_schema
attempts:        1
wall-clock:      ~9.46 s
schema:          PASS
semantic checks: PASS
```

This is sufficiently fast for the offline editing workflow.

## Retry/failure behavior

P4 keeps bounded retry behavior for retryable network/provider failures and for one schema/semantic correction attempt. It does not silently switch providers/models after a semantic failure.

## Artifacts

Successful runs produce:

```text
edit-plan.json
edit-plan.meta.json
```

The metadata sidecar records requested/returned model, profile, structured mode, attempts, wall-clock time, Bifrost request ID, usage, and gateway extra fields. No auth token is stored.

## Final gate

- real Karve container -> Bifrost connectivity — **PASS**;
- quality model available and callable — **PASS**;
- strict `json_schema` on Qwen 235B — **PASS**;
- representative Arabic edit-plan generation — **PASS**;
- Ajv + semantic verification — **PASS**;
- manual semantic editing review — **PASS**;
- model latency practical for workflow — **PASS**;
- optional Fast profile — **NON-BLOCKING FOLLOW-UP**;
- exact Bifrost version capture — **NON-BLOCKING REPRODUCIBILITY FOLLOW-UP**.

P4 is closed. P5 may begin.
