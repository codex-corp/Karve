const BIFROST_BASE_URL = "http://127.0.0.1:10020";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";

async function test() {
  const messages: any[] = [
    { role: "user", content: "Say hello, but call tool test_tool first." },
    {
      role: "assistant",
      content: null,
      tool_calls: [{ id: "call_1", type: "function", function: { name: "test_tool", arguments: "{}" } }]
    },
    {
      role: "tool",
      tool_call_id: "call_1",
      content: "Tool execution successful: user name is Alex."
    },
    {
      role: "user",
      content: "Now give your final answer based on the tool result."
    }
  ];

  const res = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3
    })
  });

  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));
}

test();
