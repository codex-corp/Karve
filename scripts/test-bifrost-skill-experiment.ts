import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN;
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/webserver/server/www/karve/.agents/skills";

// Tool definitions
const tools = [
  {
    type: "function",
    function: {
      name: "read_skill",
      description: "Read the main instructions (SKILL.md) of an installed design skill. Available skills: 'ui-styling', 'design-system', 'design'.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the installed skill (e.g. 'ui-styling', 'design-system', 'design')"
          }
        },
        required: ["skill"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_skill_file",
      description: "Read a reference or template file belonging to an installed skill.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the skill"
          },
          file_path: {
            type: "string",
            description: "Relative path inside the skill directory (e.g. 'references/canvas-design-system.md' or 'references/slides-layout-patterns.md')"
          }
        },
        required: ["skill", "file_path"]
      }
    }
  }
];

function executeTool(name: string, argsStr: string): { content: string; error?: string } {
  let args: any;
  try {
    args = JSON.parse(argsStr);
  } catch (err: any) {
    return { content: "", error: `Invalid JSON arguments: ${err.message}` };
  }

  const skill = args.skill;
  if (!skill || typeof skill !== "string") {
    return { content: "", error: "Missing skill argument" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(skill)) {
    return { content: "", error: "Invalid skill name format" };
  }

  const skillDir = path.join(SKILLS_ROOT, skill);
  if (!fs.existsSync(skillDir)) {
    return { content: "", error: `Skill '${skill}' not found at ${skillDir}` };
  }

  if (name === "read_skill") {
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      return { content: "", error: `SKILL.md not found for skill '${skill}'` };
    }
    const content = fs.readFileSync(skillMdPath, "utf-8");
    return { content };
  } else if (name === "read_skill_file") {
    const relPath = args.file_path;
    if (!relPath || typeof relPath !== "string") {
      return { content: "", error: "Missing file_path argument" };
    }
    const resolvedPath = path.resolve(skillDir, relPath);
    if (!resolvedPath.startsWith(skillDir)) {
      return { content: "", error: "Path traversal forbidden" };
    }
    if (!fs.existsSync(resolvedPath)) {
      return { content: "", error: `File not found: ${relPath}` };
    }
    const content = fs.readFileSync(resolvedPath, "utf-8");
    return { content };
  }

  return { content: "", error: `Unknown tool: ${name}` };
}

async function sendChatRequest(body: any): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (BIFROST_AUTH_TOKEN && BIFROST_AUTH_TOKEN.trim() !== "") {
    headers["Authorization"] = `Bearer ${BIFROST_AUTH_TOKEN.trim()}`;
  }

  const res = await fetch(`${BIFROST_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bifrost HTTP ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function runExperiment() {
  console.log("=== BIFROST SKILL TOOL CALL EXPERIMENT ===");
  console.log(`Target Model: ${MODEL}`);
  console.log(`Bifrost URL:  ${BIFROST_BASE_URL}\n`);

  const userPrompt = `You are going to create a visual design direction for a technical educational graphic.

Before answering, you MUST use the provided Skill tool and read the installed design Skill.

After reading it, follow its methodology.

Design problem:

Explain visually:

Dockerfile
   -> Build
Docker Image
   -> Run
Docker Container

Format:
16:9 technical educational graphic.

Do not write code.

Return:

1. Which Skill you loaded.
2. Which Skill files you read.
3. Three specific design principles from the Skill that influenced your decision.
4. Your resulting visual design direction.
5. For each of the three principles above, explain exactly where it appears in your proposed design.

Do not claim to have read the Skill unless you actually called the tool.`;

  const messages: any[] = [
    {
      role: "user",
      content: userPrompt
    }
  ];

  const conversationLog: any[] = [];
  let turn = 0;
  const maxTurns = 5;

  while (turn < maxTurns) {
    turn++;
    console.log(`\n================= TURN ${turn} =================`);

    const requestBody = {
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2
    };

    console.log(`Sending request with ${messages.length} message(s)...`);
    const start = Date.now();
    let response: any;
    try {
      response = await sendChatRequest(requestBody);
    } catch (err: any) {
      console.error(`FATAL on Turn ${turn}:`, err.message);
      process.exit(1);
    }
    const latency = Date.now() - start;
    console.log(`Response received in ${latency}ms.`);

    const choice = response.choices?.[0];
    const message = choice?.message;

    if (!message) {
      console.error("No message in response choice");
      process.exit(1);
    }

    const toolCalls = message.tool_calls;
    const content = message.content;

    conversationLog.push({
      turn,
      requestBody,
      response,
      toolCalls: toolCalls || null,
      content: content || null
    });

    if (toolCalls && toolCalls.length > 0) {
      console.log(`Model requested ${toolCalls.length} tool call(s):`);
      for (const tc of toolCalls) {
        console.log(` - ID: ${tc.id}, Function: ${tc.function?.name}, Args: ${tc.function?.arguments}`);
      }

      // Add assistant's tool_calls message to history
      messages.push(message);

      // Execute each tool call and add tool response message
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        const fnArgs = tc.function?.arguments;
        const result = executeTool(fnName, fnArgs);

        if (result.error) {
          console.log(`   [Tool Error] ${result.error}`);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: result.error })
          });
        } else {
          console.log(`   [Tool Success] Returned ${result.content.length} characters.`);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result.content
          });
        }
      }
    } else {
      console.log("\n--- Model produced final response (no more tool calls) ---");
      console.log("\n" + content + "\n");
      messages.push(message);
      break;
    }
  }

  const logPath = "/home/hany/webserver/server/www/karve/experiments/bifrost-skill-experiment-log.json";
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        model: MODEL,
        turns: turn,
        conversationLog
      },
      null,
      2
    )
  );
  console.log(`Complete raw evidence saved to: ${logPath}`);
}

runExperiment().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
