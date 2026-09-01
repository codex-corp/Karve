import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  BifrostHttpError,
  chatCompletion,
  type ChatMessage,
  type StructuredMode
} from "./bifrost-provider.ts";
import { validateEditPlan } from "./validate.ts";

type Args = {
  project: string;
  profile: "quality" | "fast";
  model?: string;
  structuredMode?: StructuredMode;
  maxAttempts: number;
  timeoutSeconds: number;
  force: boolean;
};

type ModelConfig = {
  schema_version: number;
  profiles: Record<
    string,
    {
      model: string;
      structured_mode: StructuredMode;
    }
  >;
};

type SourceMetadata = {
  schema_version: number;
  project_id: string;
  source: {
    duration_seconds: number;
    [key: string]: unknown;
  };
  video?: Record<string, unknown>;
  audio?: Record<string, unknown>;
};

type TranscriptWord = {
  start: number;
  end: number;
  text: string;
  probability: number;
};

type TranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
  words: TranscriptWord[];
};

type Transcript = {
  schema_version: number;
  project_id: string;
  language?: Record<string, unknown>;
  text: string;
  segments: TranscriptSegment[];
};

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    project: "",
    profile: "quality",
    maxAttempts: 2,
    timeoutSeconds: 120,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        fail(`Missing value for ${value}`);
      }
      return argv[index];
    };

    switch (value) {
      case "--project":
        args.project = next();
        break;
      case "--profile": {
        const profile = next();
        if (profile !== "quality" && profile !== "fast") {
          fail("--profile must be quality or fast");
        }
        args.profile = profile;
        break;
      }
      case "--model":
        args.model = next();
        break;
      case "--structured-mode": {
        const mode = next();
        if (mode !== "json_schema" && mode !== "json_object") {
          fail("--structured-mode must be json_schema or json_object");
        }
        args.structuredMode = mode;
        break;
      }
      case "--max-attempts":
        args.maxAttempts = Number.parseInt(next(), 10);
        break;
      case "--timeout-seconds":
        args.timeoutSeconds = Number.parseFloat(next());
        break;
      case "--force":
        args.force = true;
        break;
      case "--help":
        console.log(`Usage: node src/p4/plan.ts --project <id> [options]\n\nOptions:\n  --profile quality|fast        Default: quality\n  --model <provider/model>      Override the profile model\n  --structured-mode json_schema|json_object\n  --max-attempts <n>            Default: 2\n  --timeout-seconds <n>         Default: 120\n  --force                       Replace existing edit-plan.json`);
        process.exit(0);
        break;
      default:
        fail(`Unknown argument: ${value}`);
    }
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(args.project)) {
    fail("--project is required and must use only A-Z, a-z, 0-9, dot, underscore, or dash");
  }
  if (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1 || args.maxAttempts > 4) {
    fail("--max-attempts must be an integer from 1 to 4");
  }
  if (!(args.timeoutSeconds >= 1 && args.timeoutSeconds <= 600)) {
    fail("--timeout-seconds must be between 1 and 600");
  }

  return args;
}

function readJson<T>(path: string): T {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    fail(`Cannot read ${path}: ${String(error)}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    fail(`Invalid JSON in ${path}: ${String(error)}`);
  }
}

function providerSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(schema);
  delete result.$schema;
  delete result.$id;
  delete result.title;
  return result;
}

function responseFormat(
  mode: StructuredMode,
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (mode === "json_object") {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: "karve_edit_plan_v1",
      strict: true,
      schema: providerSchema(schema)
    }
  };
}

function buildMessages(
  source: SourceMetadata,
  transcript: Transcript,
  schema: Record<string, unknown>,
  mode: StructuredMode
): ChatMessage[] {
  const planningInput = {
    project_id: source.project_id,
    source_duration_seconds: source.source.duration_seconds,
    media: {
      source: source.source,
      video: source.video ?? null,
      audio: source.audio ?? null
    },
    transcript: {
      language: transcript.language ?? null,
      text: transcript.text,
      segments: transcript.segments.map((segment) => ({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        avg_logprob: segment.avg_logprob ?? null,
        no_speech_prob: segment.no_speech_prob ?? null,
        words: segment.words.map((word) => ({
          start: word.start,
          end: word.end,
          text: word.text,
          probability: word.probability
        }))
      }))
    }
  };

  const contractNote =
    mode === "json_object"
      ? `The provider is in JSON-object mode. Your object MUST validate against this exact JSON Schema:\n${JSON.stringify(schema)}`
      : "The gateway is enforcing the Karve JSON schema. Return only the schema object.";

  return [
    {
      role: "system",
      content: [
        "You are Karve's semantic video editor for talking-head and technical videos.",
        "Plan edits; do not render or rewrite the raw transcript.",
        "A remove decision is destructive. Prefer conservative edits and remove only content clearly supported by the timeline evidence.",
        "Repeated takes: remove an earlier take only when a later take clearly supersedes it or the earlier take is an obvious false start/mistake.",
        "Do not delete meaningful pauses merely because silence exists.",
        "ASR word probabilities are soft confidence signals, not truth scores. Low-confidence words may be dialect, names, or technical vocabulary.",
        "Never remove content solely because an ASR word looks uncertain. Use a keep decision with reason_code=uncertain_asr when uncertainty affects a destructive choice.",
        "Keep/remove decisions must not contradict or overlap. Remove ranges must not overlap each other.",
        "Visual intents are non-destructive suggestions for later phases and must not target removed ranges.",
        "Use exact source-timeline seconds from the transcript. Do not invent speech or events not represented in the supplied artifacts.",
        "Use evidence_segment_ids to point to transcript segments that justify each decision.",
        contractNote
      ].join("\n")
    },
    {
      role: "user",
      content: `Create the Karve edit plan for this project.\n\n${JSON.stringify(planningInput)}`
    }
  ];
}

function shouldRetryError(error: unknown): boolean {
  if (error instanceof BifrostHttpError) {
    return error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
  }

  const text = String(error);
  return (
    text.includes("TimeoutError") ||
    text.includes("fetch failed") ||
    text.includes("ECONNRESET") ||
    text.includes("ECONNREFUSED")
  );
}

function writeAtomic(path: string, value: unknown): void {
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temp, path);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dataRoot = process.env.KARVE_DATA_ROOT || "/karve-data";
  const projectDir = resolve(dataRoot, "projects", args.project);
  const sourcePath = resolve(projectDir, "source.json");
  const transcriptPath = resolve(projectDir, "transcript.json");
  const outputPath = resolve(projectDir, "edit-plan.json");
  const metaPath = resolve(projectDir, "edit-plan.meta.json");
  const schemaPath = resolve("schemas", "edit-plan.schema.json");
  const modelConfigPath = resolve("config", "p4-models.json");

  if (!args.force) {
    try {
      readFileSync(outputPath, "utf8");
      fail(`edit-plan.json already exists for ${args.project}; pass --force to replace it`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
      }
      // File does not exist; continue.
    }
  }

  const source = readJson<SourceMetadata>(sourcePath);
  const transcript = readJson<Transcript>(transcriptPath);
  const schema = readJson<Record<string, unknown>>(schemaPath);
  const modelConfig = readJson<ModelConfig>(modelConfigPath);

  if (source.project_id !== args.project || transcript.project_id !== args.project) {
    fail("source.json/transcript.json project_id does not match --project");
  }
  if (!Array.isArray(transcript.segments) || transcript.segments.length === 0) {
    fail("transcript.json has no segments to plan");
  }

  const profileConfig = modelConfig.profiles[args.profile];
  if (!profileConfig) {
    fail(`Missing P4 model profile: ${args.profile}`);
  }

  const model = args.model || profileConfig.model;
  const mode =
    args.structuredMode ||
    (process.env.BIFROST_STRUCTURED_MODE as StructuredMode | undefined) ||
    profileConfig.structured_mode;
  if (mode !== "json_schema" && mode !== "json_object") {
    fail(`Invalid structured mode: ${String(mode)}`);
  }

  const baseUrl = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
  const token = process.env.BIFROST_AUTH_TOKEN;
  const timeoutMs = args.timeoutSeconds * 1000;
  const originalMessages = buildMessages(source, transcript, schema, mode);
  const messages: ChatMessage[] = [...originalMessages];
  const segmentIds = new Set(transcript.segments.map((segment) => Number(segment.id)));

  let lastError: unknown = null;
  let finalResult: Awaited<ReturnType<typeof chatCompletion>> | null = null;
  let finalPlan: Record<string, unknown> | null = null;
  let attemptsUsed = 0;
  const startedAt = Date.now();

  console.log(`==> P4 planning project: ${args.project}`);
  console.log(`==> Profile/model: ${args.profile} / ${model}`);
  console.log(`==> Structured mode: ${mode}`);
  console.log(`==> Bifrost: ${baseUrl}`);

  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const result = await chatCompletion(
        baseUrl,
        token,
        {
          model,
          messages,
          response_format: responseFormat(mode, schema),
          temperature: 0.1
        },
        timeoutMs
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.content);
      } catch (error) {
        throw new Error(`Assistant content is not pure JSON: ${String(error)}`);
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Assistant JSON must be an object");
      }

      const plan = parsed as Record<string, unknown>;
      plan.schema_version = 1;
      plan.project_id = args.project;
      plan.source_duration_seconds = source.source.duration_seconds;

      const validation = validateEditPlan(plan, schemaPath, {
        projectId: args.project,
        sourceDurationSeconds: source.source.duration_seconds,
        transcriptSegmentIds: segmentIds
      });

      if (!validation.ok) {
        const message = validation.errors.slice(0, 8).join("\n");
        lastError = new Error(`Edit plan validation failed:\n${message}`);

        if (attempt < args.maxAttempts) {
          messages.push({ role: "assistant", content: result.content });
          messages.push({
            role: "user",
            content: `Your previous edit plan failed deterministic validation. Return a complete replacement JSON object only. Fix every issue below without changing the source timeline:\n${message}`
          });
          console.log(`==> Validation failed on attempt ${attempt}; retrying once with validator feedback`);
          continue;
        }
        break;
      }

      finalResult = result;
      finalPlan = plan;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < args.maxAttempts && shouldRetryError(error)) {
        console.log(`==> Retryable Bifrost error on attempt ${attempt}; retrying`);
        await sleep(500 * attempt);
        continue;
      }
      break;
    }
  }

  if (!finalResult || !finalPlan) {
    if (lastError instanceof BifrostHttpError && (lastError.status === 400 || lastError.status === 422)) {
      fail(
        `${lastError.message}\nThe selected Bedrock model may not support the requested response_format through this Bifrost route. Run scripts/p4-bifrost-probe.sh, or retry explicitly with --structured-mode json_object; Karve will still enforce the local schema.`
      );
    }
    fail(lastError ? String(lastError) : "P4 planning failed without a result");
  }

  const elapsedMs = Date.now() - startedAt;
  writeAtomic(outputPath, finalPlan);
  writeAtomic(metaPath, {
    schema_version: 1,
    project_id: args.project,
    created_at: new Date().toISOString(),
    profile: args.profile,
    requested_model: model,
    response_model: finalResult.model,
    structured_mode: mode,
    attempts: attemptsUsed,
    wall_clock_ms: elapsedMs,
    bifrost_response_id: finalResult.raw_id,
    usage: finalResult.usage,
    extra_fields: finalResult.extra_fields
  });

  const decisions = Array.isArray(finalPlan.decisions) ? finalPlan.decisions.length : 0;
  const visualIntents = Array.isArray(finalPlan.visual_intents)
    ? finalPlan.visual_intents.length
    : 0;

  console.log("\nP4 structured edit planning: PASS");
  console.log(`Project: ${args.project}`);
  console.log(`Model: ${model}`);
  console.log(`Attempts: ${attemptsUsed}`);
  console.log(`Decisions: ${decisions}`);
  console.log(`Visual intents: ${visualIntents}`);
  console.log(`Output: ${outputPath}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
