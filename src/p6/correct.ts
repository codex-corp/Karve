/**
 * P6-B Bifrost Caption Corrector
 *
 * Sends raw transcript words to Bifrost/LLM for sparse ASR error detection.
 * Validates the response against the caption-corrections schema.
 * Writes caption-corrections.json to the project directory.
 *
 * Rules:
 *   - Only phonetic/ASR recognition errors are corrected.
 *   - Dialect, slang, colloquialisms, and grammar are preserved exactly.
 *   - The LLM must NOT rewrite, formalize, summarize, or invent speech.
 *   - Low-confidence corrections (< 0.7) are flagged for manual review.
 */

import { readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  BifrostHttpError,
  chatCompletion,
  type ChatMessage,
  type StructuredMode
} from "../p4/bifrost-provider.ts";
import { flattenTranscriptWords, type CaptionCorrections } from "./align.ts";

type Args = {
  project: string;
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

type TranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
  words: Array<{
    start: number;
    end: number;
    text: string;
    probability: number;
  }>;
};

type Transcript = {
  schema_version: number;
  project_id: string;
  language?: Record<string, unknown>;
  text: string;
  segments: TranscriptSegment[];
};

const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function fail(message: string): never {
  throw new Error(message);
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${String(error)}`);
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    project: "",
    maxAttempts: 2,
    timeoutSeconds: 120,
    force: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    switch (key) {
      case "--project":
        args.project = argv[++index] || "";
        break;
      case "--model":
        args.model = argv[++index] || "";
        break;
      case "--structured-mode":
        args.structuredMode = (argv[++index] || "") as StructuredMode;
        break;
      case "--max-attempts":
        args.maxAttempts = Number(argv[++index]);
        break;
      case "--timeout":
        args.timeoutSeconds = Number(argv[++index]);
        break;
      case "--force":
        args.force = true;
        break;
      case "-h":
      case "--help":
        console.log(
          "Usage: node src/p6/correct.ts --project <id> " +
            "[--model <model>] [--structured-mode json_schema|json_object] " +
            "[--max-attempts <n>] [--timeout <seconds>] [--force]"
        );
        process.exit(0);
      default:
        fail(`Unknown argument: ${key}`);
    }
  }
  if (!args.project || !PROJECT_RE.test(args.project)) {
    fail("--project must be a valid Karve project id");
  }
  return args;
}

function buildCorrectionPrompt(
  transcript: Transcript,
  schema: Record<string, unknown>,
  mode: StructuredMode
): ChatMessage[] {
  const flatWords = flattenTranscriptWords(transcript.segments);

  const wordContext = flatWords.map((word) => ({
    index: word.global_index,
    text: word.text,
    probability: word.probability,
    segment_id: word.segment_id
  }));

  const contractNote =
    mode === "json_object"
      ? `The provider is in JSON-object mode. Your object MUST validate against this exact JSON Schema:\n${JSON.stringify(schema)}`
      : "The gateway is enforcing the Karve JSON schema. Return only the schema object.";

  return [
    {
      role: "system",
      content: [
        "You are Karve's ASR Caption Corrector for Arabic speech recognition output.",
        "",
        "Your ONLY task: identify and correct clear ASR recognition errors in spoken Arabic.",
        "",
        "DO NOT:",
        "- Rewrite style or improve wording",
        "- Formalize dialect (بدي stays بدي, NOT أريد)",
        "- Change grammar unnecessarily",
        "- Replace colloquial Syrian/Gulf/Egyptian wording with formal Arabic",
        "- Summarize or restructure sentences",
        "- Invent missing speech or add words that were not spoken",
        "- Correct proper nouns or names unless clearly garbled",
        "- Remove or delete any words",
        "",
        "DO correct only:",
        "- Phonetic ASR errors where the wrong Arabic word was recognized (e.g. مفترب → مغترب)",
        "- Missing or extra letters from ASR mishearing (e.g. لحشتك → لهجتك)",
        "- Wrong word boundaries where ASR split or merged words incorrectly",
        "- Dialect transcription errors where ASR used formal Arabic instead of the spoken dialect word",
        "",
        "Return SPARSE corrections only. When uncertain, leave the raw token unchanged.",
        "Each correction must reference word indices from the input array.",
        "The original_text field must exactly match the raw text of the referenced word(s).",
        "For multi-word corrections, original_text is the words joined with a single space.",
        "",
        `The project_id for this transcript is: "${transcript.project_id}"`,
        "",
        contractNote
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `Analyze these ${flatWords.length} ASR words and return sparse corrections.`,
        "",
        "Full transcript text:",
        transcript.text,
        "",
        "Words with indices and ASR probabilities:",
        JSON.stringify(wordContext, null, 2)
      ].join("\n")
    }
  ];
}

function responseFormat(
  mode: StructuredMode,
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (mode === "json_schema") {
    return {
      type: "json_schema",
      json_schema: {
        name: "KarveCaptionCorrections",
        strict: true,
        schema
      }
    };
  }
  return { type: "json_object" };
}

function validateWithAjv(outputPath: string, schemaPath: string): void {
  const result = spawnSync(
    "ajv",
    ["validate", "--spec=draft2020", "-s", schemaPath, "-d", outputPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  if (result.status !== 0) {
    const error = (result.stderr || result.stdout || "").trim();
    fail(`caption-corrections.json failed AJV schema validation: ${error}`);
  }
}

function shouldRetryError(error: unknown): boolean {
  if (error instanceof BifrostHttpError) {
    return (
      error.status === 408 ||
      error.status === 409 ||
      error.status === 429 ||
      error.status >= 500
    );
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
  const transcriptPath = join(projectDir, "transcript.json");
  const outputPath = join(projectDir, "caption-corrections.json");
  const schemaPath = resolve("schemas", "caption-corrections.schema.json");
  const modelConfigPath = resolve("config", "p4-models.json");

  if (!existsSync(transcriptPath)) {
    fail(`transcript.json not found for project: ${args.project}`);
  }
  if (!args.force && existsSync(outputPath)) {
    fail(
      `caption-corrections.json already exists for ${args.project}; pass --force to replace it`
    );
  }

  const transcript = readJson<Transcript>(transcriptPath);
  const schema = readJson<Record<string, unknown>>(schemaPath);
  const modelConfig = readJson<ModelConfig>(modelConfigPath);

  if (transcript.project_id !== args.project) {
    fail(`transcript.json project_id does not match --project`);
  }

  // Use quality profile model for corrections.
  const profileConfig = modelConfig.profiles.quality;
  if (!profileConfig) {
    fail("Missing P4 'quality' model profile for caption correction");
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
  const messages = buildCorrectionPrompt(transcript, schema, mode);

  console.log(`==> P6-B caption correction for project: ${args.project}`);
  console.log(`==> Model: ${model}`);
  console.log(`==> Structured mode: ${mode}`);
  console.log(`==> Bifrost: ${baseUrl}`);

  let lastError: unknown = null;
  let result: CaptionCorrections | null = null;

  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    try {
      console.log(`==> Attempt ${attempt}/${args.maxAttempts}...`);
      const response = await chatCompletion(
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

      const parsed = JSON.parse(response.content) as CaptionCorrections;
      if (parsed.schema_version !== 1) {
        fail("Response schema_version must be 1");
      }
      if (parsed.project_id !== args.project) {
        fail(`Response project_id '${parsed.project_id}' does not match '${args.project}'`);
      }

      // Validate corrections are structurally sound.
      const flatWords = flattenTranscriptWords(transcript.segments);
      for (const correction of parsed.corrections) {
        if (
          correction.source_word_start < 0 ||
          correction.source_word_end >= flatWords.length
        ) {
          fail(
            `Correction index [${correction.source_word_start}, ${correction.source_word_end}] ` +
              `out of bounds (${flatWords.length} words)`
          );
        }
        const originals = flatWords
          .slice(correction.source_word_start, correction.source_word_end + 1)
          .map((w) => w.text)
          .join(" ");
        if (originals !== correction.original_text) {
          console.warn(
            `WARNING: Correction original_text mismatch at ` +
              `[${correction.source_word_start}, ${correction.source_word_end}]: ` +
              `LLM said '${correction.original_text}', actual is '${originals}'`
          );
          correction.original_text = originals;
        }
      }

      result = parsed;
      console.log(
        `==> Received ${parsed.corrections.length} correction(s) from ${response.model || model}`
      );
      break;
    } catch (error) {
      lastError = error;
      if (attempt < args.maxAttempts && shouldRetryError(error)) {
        const waitMs = 2000 * attempt;
        console.warn(`==> Attempt ${attempt} failed, retrying in ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }

  if (!result) {
    fail(`All ${args.maxAttempts} attempts failed: ${String(lastError)}`);
  }

  // Write and validate.
  writeAtomic(outputPath, result);
  validateWithAjv(outputPath, schemaPath);

  const lowConfidence = result.corrections.filter((c) => c.confidence < 0.7);
  console.log(`\nP6-B caption correction: PASS`);
  console.log(`Project: ${args.project}`);
  console.log(`Corrections: ${result.corrections.length}`);
  if (lowConfidence.length > 0) {
    console.log(`Flagged for review: ${lowConfidence.length}`);
    for (const flagged of lowConfidence) {
      console.log(
        `  ⚠ [${flagged.source_word_start}] '${flagged.original_text}' → ` +
          `'${flagged.replacement.join(" ")}' (confidence: ${flagged.confidence})`
      );
    }
  }
  console.log(`Output: ${outputPath}`);
}

try {
  main().catch((error) => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
