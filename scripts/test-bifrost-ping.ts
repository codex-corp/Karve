import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN || "sk-bf-1e5e5585-ff41-4407-8f73-8cc7b0dadcbb";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";

async function ping() {
  const tools = [
    {
      type: "function",
      function: {
        name: "test_tool",
        description: "A test tool",
        parameters: {
          type: "object",
          properties: {
            arg: { type: "string" }
          },
          required: ["arg"]
        }
      }
    }
  ];

  const body = {
    model: MODEL,
    messages: [
      { role: "user", content: "Please call test_tool with arg='ping' to verify connectivity." }
    ],
    tools,
    tool_choice: "auto",
    temperature: 0.1
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BIFROST_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${BIFROST_AUTH_TOKEN}`;
  }

  const start = Date.now();
  console.log(`Sending ping to Bifrost (${MODEL})...`);
  const res = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });

  const latency = Date.now() - start;
  console.log(`HTTP ${res.status} in ${latency}ms`);
  const json = await res.json();
  console.log("Choice 0:", JSON.stringify(json.choices?.[0]?.message, null, 2));
}

ping().catch(err => {
  console.error("Ping error:", err);
  process.exit(1);
});
