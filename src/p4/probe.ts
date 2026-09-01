import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chatCompletion,
  healthCheck,
  listModels,
  type StructuredMode
} from "./bifrost-provider.ts";

type ModelConfig = {
  profiles: Record<string, { model: string; structured_mode: StructuredMode }>;
};

const tinySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["ok"]
    }
  }
};

function readConfig(): ModelConfig {
  return JSON.parse(readFileSync(resolve("config", "p4-models.json"), "utf8")) as ModelConfig;
}

async function probeModel(
  profile: string,
  model: string,
  baseUrl: string,
  token: string | undefined,
  timeoutMs: number
): Promise<void> {
  console.log(`==> Probing ${profile}: ${model}`);

  try {
    const strictResult = await chatCompletion(
      baseUrl,
      token,
      {
        model,
        messages: [
          {
            role: "user",
            content: 'Return exactly one JSON object with status equal to "ok".'
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "karve_bifrost_probe",
            strict: true,
            schema: tinySchema
          }
        },
        temperature: 0
      },
      timeoutMs
    );

    const parsed = JSON.parse(strictResult.content) as { status?: unknown };
    if (parsed.status !== "ok") {
      throw new Error(`strict response status is ${String(parsed.status)}`);
    }
    console.log(`    strict json_schema: PASS`);
    return;
  } catch (strictError) {
    console.log(`    strict json_schema: FAIL (${String(strictError).slice(0, 500)})`);
  }

  const objectResult = await chatCompletion(
    baseUrl,
    token,
    {
      model,
      messages: [
        {
          role: "user",
          content: 'Return JSON only: {"status":"ok"}'
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    },
    timeoutMs
  );

  const parsed = JSON.parse(objectResult.content) as { status?: unknown };
  if (parsed.status !== "ok") {
    throw new Error(`json_object response status is ${String(parsed.status)}`);
  }

  console.log(`    json_object: PASS`);
  console.log(
    `    NOTE: use --structured-mode json_object for this profile until strict schema support is verified.`
  );
}

async function main(): Promise<void> {
  const config = readConfig();
  const baseUrl = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
  const token = process.env.BIFROST_AUTH_TOKEN;
  const timeoutMs = 30_000;

  console.log(`==> Bifrost base URL: ${baseUrl}`);
  const health = await healthCheck(baseUrl, token, timeoutMs);
  console.log(`==> Health: ${JSON.stringify(health)}`);

  const models = await listModels(baseUrl, token, timeoutMs);
  console.log(`==> Models advertised: ${models.length}`);

  for (const profile of ["quality", "fast"]) {
    const entry = config.profiles[profile];
    if (!entry) {
      throw new Error(`Missing model profile: ${profile}`);
    }
    if (!models.includes(entry.model)) {
      throw new Error(`Bifrost /v1/models does not advertise ${entry.model}`);
    }
    await probeModel(profile, entry.model, baseUrl, token, timeoutMs);
  }

  console.log("\nP4 Bifrost contract probe: PASS");
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
