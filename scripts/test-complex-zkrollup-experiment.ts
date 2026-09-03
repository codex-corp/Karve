import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN;
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/ai-skills";
const TEMPERATURE = 0.3;

const tools = [
  {
    type: "function",
    function: {
      name: "read_skill",
      description: "Read the main instructions (SKILL.md) of an installed skill in ~/ai-skills.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the skill ('ui-styling', 'remotion-markup', 'remotion-best-practices')"
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
      description: "Read a reference file belonging to an installed skill in ~/ai-skills.",
      parameters: {
        type: "object",
        properties: {
          skill: { type: "string" },
          file_path: {
            type: "string",
            description: "Relative path inside the skill directory (e.g. 'references/canvas-design-system.md')"
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

  const skillDir = path.join(SKILLS_ROOT, skill);
  if (!fs.existsSync(skillDir)) {
    return { content: "", error: `Skill '${skill}' not found at ${skillDir}` };
  }

  if (name === "read_skill") {
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      return { content: "", error: `SKILL.md not found for skill '${skill}'` };
    }
    return { content: fs.readFileSync(skillMdPath, "utf-8") };
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
    return { content: fs.readFileSync(resolvedPath, "utf-8") };
  }

  return { content: "", error: `Unknown tool: ${name}` };
}

async function sendChatRequest(body: any): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BIFROST_AUTH_TOKEN && BIFROST_AUTH_TOKEN.trim() !== "") {
    headers["Authorization"] = `Bearer ${BIFROST_AUTH_TOKEN.trim()}`;
  }

  const res = await fetch(`${BIFROST_BASE_URL.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bifrost HTTP ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function main() {
  console.log("=== BIFROST COMPLEX TOPIC EXPERIMENT (ZK-ROLLUP LIFECYCLE) ===");

  const taskPrompt = `Create the visual direction for a 16:9 technical educational graphic explaining a Zero-Knowledge Rollup (ZK-Rollup) lifecycle:

1. Off-Chain Batch Execution (L2 Sequencer): 1,000+ user transactions aggregated into an execution batch, state tree updated (Merkle root delta).
2. ZK Prover & Polynomial Circuit (Mathematical Compression): Cryptographic proving engine compiles the execution trace into an algebraic circuit, generating a succinct 256-bit validity proof (SNARK/STARK Proof π).
3. On-Chain L1 Settlement (Ethereum Mainnet): L1 Rollup Contract verifies the validity proof in O(1) time and atomically commits the new canonical State Root.

Audience:
Senior distributed systems and cryptography software engineers.

Requirements:
- modern, clean, museum-grade visual Polish
- minimal text (90% visual communication, 10% essential labels)
- strong asymmetric hierarchy (dense transaction matrix -> compressed crystal proof -> canonical base layer)
- no generic SaaS UI cards or basic flowchart boxes
- suitable for motion/video framing
- strict oklch color space logic and geometric discipline

Use the installed ui-styling skill (specifically references/canvas-design-system.md) as your primary visual design philosophy ("Geometric Silence").
Also consider Remotion animation and SVG principles from remotion-markup.

Before answering, use the provided tools to read the required skills.

Then produce ONE comprehensive visual direction covering:
1. Composition & 16:9 Layout (asymmetric mass, active negative space)
2. Visual representation of Off-chain Transaction Batch & Merkle State Delta
3. Visual representation of the ZK Prover / Algebraic Circuit Compression (The Proof π)
4. Visual representation of On-chain L1 Settlement & Canonical State Root
5. Transition Metaphor 1: Batch Execution -> Circuit Compilation & Proof
6. Transition Metaphor 2: Validity Proof -> L1 Pairing Check & Root Update
7. Typography & Mathematical Notation System
8. Color System & OKLCH Logic
9. Specific Canvas Design System principles applied`;

  const messages: any[] = [{ role: "user", content: taskPrompt }];
  const filesRead: string[] = [];
  const toolExecutions: any[] = [];
  let turn = 0;
  const maxToolTurns = 2;

  while (turn < maxToolTurns) {
    turn++;
    console.log(`[Turn ${turn}] Sending request with tools...`);

    const requestBody: any = {
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: TEMPERATURE
    };

    const start = Date.now();
    const response = await sendChatRequest(requestBody);
    const latency = Date.now() - start;

    const choice = response.choices?.[0];
    const message = choice?.message;
    const toolCalls = message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      console.log(`[Turn ${turn}] Model requested ${toolCalls.length} tool call(s) in ${latency}ms:`);
      messages.push(message);

      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        const fnArgs = tc.function?.arguments;
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(fnArgs);
        } catch {}

        if (fnName === "read_skill") {
          filesRead.push(`${parsedArgs.skill}/SKILL.md`);
        } else if (fnName === "read_skill_file") {
          filesRead.push(`${parsedArgs.skill}/${parsedArgs.file_path}`);
        }

        console.log(` - Tool: ${fnName}(${fnArgs})`);
        const result = executeTool(fnName, fnArgs);
        toolExecutions.push({
          turn,
          name: fnName,
          args: fnArgs,
          success: !result.error,
          length: result.content?.length || 0,
          error: result.error
        });

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result.error ? JSON.stringify({ error: result.error }) : result.content
        });
      }
    } else {
      break;
    }
  }

  console.log(`[Synthesis Turn] Calling Bifrost for final textual direction...`);
  messages.push({
    role: "user",
    content: "All skill reference materials have been retrieved. Now, applying strictly the Geometric Silence and Canvas Design System principles (90% visual, 10% essential text, strict OKLCH colors, mathematical precision, museum-grade craftsmanship, asymmetric composition), write your complete and detailed visual design direction covering points 1 through 9. Do not call any more tools."
  });

  const synthesisBody: any = {
    model: MODEL,
    messages,
    temperature: TEMPERATURE
  };

  const start = Date.now();
  const response = await sendChatRequest(synthesisBody);
  const latency = Date.now() - start;
  console.log(`[Synthesis Turn] Response received in ${latency}ms.`);

  const finalChoice = response.choices?.[0];
  const finalContent = finalChoice?.message?.content;

  const outputLog = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    topic: "ZK-Rollup Batch Execution & Validity Proof Lifecycle",
    filesRead: Array.from(new Set(filesRead)),
    toolExecutions,
    finalDirection: finalContent
  };

  const outputPath = "/home/hany/webserver/server/www/karve/experiments/zkrollup-direction-log.json";
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outputLog, null, 2));

  console.log(`\n=======================================================`);
  console.log(`Visual Direction Generated. Saved to: ${outputPath}`);
  console.log(`=======================================================\n`);
  console.log(finalContent);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
