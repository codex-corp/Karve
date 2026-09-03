import { chatCompletion } from "../src/p4/bifrost-provider.ts";

async function testModel(modelName: string) {
  const baseUrl = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
  const token = process.env.BIFROST_AUTH_TOKEN;

  console.log(`\n==> Testing Bedrock Model: ${modelName}`);
  const start = Date.now();
  try {
    const res = await chatCompletion(
      baseUrl,
      token,
      {
        model: modelName,
        messages: [
          { role: "system", content: "You are an expert UI/UX design director for motion graphics and technical explainers." },
          { role: "user", content: "Give 1 sentence summarizing a futuristic yet clean technical design aesthetic for video motion graphics." }
        ],
        response_format: { type: "text" },
        temperature: 0.7
      },
      15000
    );
    const ms = Date.now() - start;
    console.log(`[PASS] (${ms}ms) Response: ${res.content.trim()}`);
    return true;
  } catch (err: any) {
    console.log(`[FAIL] ${err.message}`);
    return false;
  }
}

async function main() {
  const candidates = [
    "bedrock/qwen.qwen3-235b-a22b-2507-v1:0",
    "bedrock/qwen.qwen3-coder-480b-a35b-v1:0",
    "bedrock/mistral.pixtral-large-2502-v1:0",
    "bedrock/moonshot.kimi-k2-thinking",
    "bedrock/apac.amazon.nova-pro-v1:0"
  ];

  for (const c of candidates) {
    await testModel(c);
  }
}

main();
