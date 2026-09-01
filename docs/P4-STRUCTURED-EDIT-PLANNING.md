# P4 — Structured Edit Planning

## Status

**IMPLEMENTED — REAL WSL/BIFROST HOST VERIFICATION PENDING**

P0-P3 are closed as PASS. P4 adds the first semantic editing stage: Karve reads the existing `source.json` + `transcript.json`, asks the already-running Bifrost gateway for a structured editing plan, validates that plan deterministically, and writes `edit-plan.json`.

P4 does **not** cut or render video. P5 will consume validated remove/keep decisions. P6+ will consume visual intent.

## Bifrost boundary

Karve does not add a direct Bedrock SDK path. The application-facing boundary is the existing local Bifrost OpenAI-shaped Chat Completions endpoint:

```text
Karve
  -> Bifrost
     -> Bedrock model
```

Verified runtime contract supplied from the real host:

```text
base URL:              http://127.0.0.1:10020
health:                GET /health
models:                GET /v1/models
chat:                  POST /v1/chat/completions
local auth:            none currently required
optional auth shape:   Authorization: Bearer <token>
structured output:     json_object and json_schema observed at gateway level
```

The exact installed Bifrost version/commit is still unknown and must be recorded during the host gate. P4 deliberately uses only the small request surface already observed live; it does not edit the active Bifrost configuration or depend on version-sensitive routing/governance features.

## Model policy

Gemini is intentionally not used in the current P4 default path because its available credits are limited.

Versioned model profiles live in `config/p4-models.json`:

```text
quality/default:
  bedrock/qwen.qwen3-235b-a22b-2507-v1:0

fast:
  bedrock/apac.amazon.nova-2-lite-v1:0
```

Routing is explicit and deterministic in V1. Karve does not automatically switch to another provider/model after a semantic failure. A later measured need may justify a Bifrost fallback policy, but P4 starts with one known model per profile so quality comparisons remain understandable.

## Container-to-Bifrost networking

Bifrost currently listens on WSL localhost. Exposing it on `0.0.0.0` only to reach it from the Karve bridge network would weaken the local security boundary.

P4 therefore has a narrow Compose override, `docker-compose.p4.yml`, which gives only P4 invocations host networking. Inside those invocations, `http://127.0.0.1:10020` still points to the WSL host where Bifrost is already listening.

Normal P0-P3 Compose behavior is unchanged.

Override the URL only when needed:

```bash
export BIFROST_BASE_URL=http://127.0.0.1:10020
```

If inference authentication is later enabled, pass the token through the environment rather than committing it:

```bash
export BIFROST_AUTH_TOKEN='...'
```

## Structured output modes

Preferred mode:

```text
json_schema
```

Karve sends the static edit-plan JSON Schema through `response_format.type=json_schema` with `strict=true`.

Because structured-output support may vary by Bedrock model even when Bifrost itself accepts the request shape, P4 also supports an explicit compatibility mode:

```text
json_object
```

In that mode the provider is asked for JSON only, and Karve still validates the response locally against the exact same schema. There is no prose scraping, Markdown fence stripping, or best-effort parsing: assistant content must be pure JSON.

Use the probe before the real planning call to determine what the currently installed gateway/model combination supports.

## Deterministic validation

P4 uses the mature Ajv JSON Schema validator through the container-only `ajv` CLI. The image pins `ajv-cli@5.0.0`; no Node package is installed globally on Windows/WSL.

Schema:

```text
schemas/edit-plan.schema.json
```

The schema is JSON Schema 2020-12 and rejects unknown properties.

Karve also applies semantic invariants that JSON Schema alone cannot express cleanly:

- all ranges must satisfy `start < end` and remain inside source duration;
- referenced transcript segment IDs must exist;
- `uncertain_asr` cannot itself justify a destructive remove action;
- contradictory keep/remove ranges are rejected;
- overlapping remove ranges are rejected;
- visual intents cannot target content that the same plan removes;
- project ID and source duration are pinned to deterministic source artifacts rather than trusted from the model.

## Edit-plan v1

The semantic artifact contains:

```text
schema_version
project_id
source_duration_seconds
summary

decisions[]
  action: keep | remove
  start/end
  reason_code
  reason
  confidence
  evidence_segment_ids[]

visual_intents[]
  type: punch_in | caption_emphasis | title | callout | explainer
  start/end
  reason
  confidence
  intensity
  text
```

`confidence` is the planner's confidence in its editing decision. It is separate from Whisper word probability.

The raw `transcript.json` is never overwritten.

## ASR confidence rule

P4 passes word timestamps and Whisper probabilities to the planner as **soft evidence**.

The prompt explicitly tells the model that low-probability words may be dialect, names, or technical vocabulary and that a destructive cut must never be based only on ASR uncertainty.

This preserves the P3 finding that even an incorrect word can have moderate/high probability.

## Retry/failure behavior

Default maximum attempts: `2`.

Karve retries the same explicit model for retryable network/provider failures such as timeout, 429, and 5xx responses.

If a model response is valid JSON but fails schema/semantic validation, one bounded correction attempt is sent with deterministic validator errors.

Non-retryable request errors stop immediately. A `400`/`422` around `response_format` produces an actionable message recommending the probe or explicit `--structured-mode json_object` mode; Karve does not silently change providers.

Successful runs also write:

```text
edit-plan.meta.json
```

with requested/returned model, profile, structured mode, attempts, wall-clock time, Bifrost request ID, usage, and Bifrost extra fields. No auth token is stored.

## Real-host gate

After pulling P4, rebuild once because the container adds the schema validator:

```bash
git pull
bash scripts/bootstrap.sh
```

The doctor should now report the AJV CLI in addition to the existing P3 runtime.

### 1. Probe the real Bifrost boundary

```bash
bash scripts/p4-bifrost-probe.sh
```

The probe verifies:

- Karve can reach Bifrost on localhost through the P4 host-network override;
- `/health` responds;
- `/v1/models` advertises both configured Bedrock model IDs;
- `quality` and `fast` each accept a tiny structured request;
- if strict `json_schema` fails but `json_object` works, that fact is reported explicitly.

### 2. Produce a real edit plan

Use the difficult Arabic sample that already passed P3 with the quality transcript:

```bash
bash scripts/p4-run.sh sample-3-large
```

If the probe proves that the selected model does not support strict schema mode through the installed route:

```bash
bash scripts/p4-run.sh sample-3-large --structured-mode json_object
```

### 3. Verify deterministically

```bash
bash scripts/p4-verify.sh sample-3-large
jq . ~/karve-data/projects/sample-3-large/edit-plan.json
jq . ~/karve-data/projects/sample-3-large/edit-plan.meta.json
```

### 4. Manual semantic quality gate

Automated schema PASS is not enough. Compare the plan to the actual source and answer:

- Did it preserve meaningful speech?
- Did it identify obvious false starts/repeated takes correctly?
- Did it avoid destructive edits caused by dialect/ASR mistakes?
- Are remove ranges precisely aligned enough for P5?
- Are punch-in/caption/card/explainer suggestions relevant rather than generic or excessive?
- Does the result move toward the intended Karve taste instead of generic AI over-editing?

For an optional model A/B on the exact same project:

```bash
bash scripts/p4-run.sh sample-3-large --profile fast --force
```

Save/copy the quality result before overwriting if both artifacts need to be inspected side by side.

## P4 acceptance gate

P4 becomes PASS only when:

1. bootstrap/doctor passes with the P4 validator;
2. installed Bifrost version/commit is recorded;
3. real container-to-local-Bifrost connectivity passes;
4. configured quality model exists and completes the required structured mode;
5. a representative Arabic project produces `edit-plan.json`;
6. `p4-verify.sh` passes;
7. manual review accepts the semantic edit decisions and visual intent as useful enough to drive P5/P6.

No P5 execution begins before this gate.

## Development-side verification before publication

Before publication, the P4 implementation was checked with:

- Node TypeScript syntax checks;
- shell syntax checks;
- JSON Schema compilation/validation;
- a mocked Bifrost OpenAI-shaped server;
- exact quality/fast model profile discovery;
- strict structured-output probe behavior;
- network retry behavior;
- invalid-plan validator feedback followed by a corrected second response;
- JSON-object compatibility mode;
- deterministic source metadata pinning;
- overwrite protection;
- standalone edit-plan verification.

The real Bedrock/Bifrost request remains the target WSL host gate.
