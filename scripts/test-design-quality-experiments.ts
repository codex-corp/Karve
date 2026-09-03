import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN;
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/webserver/server/www/karve/.agents/skills";
const TEMPERATURE = 0.3;

const tools = [
  {
    type: "function",
    function: {
      name: "read_skill",
      description: "Read the main instructions (SKILL.md) of an installed design skill. Available skills: 'ui-styling', 'design-system'.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the installed skill ('ui-styling' or 'design-system')"
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
    signal: AbortSignal.timeout(90000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bifrost HTTP ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

const CORE_TASK_PROMPT = `Create the visual direction for a 16:9 technical educational graphic explaining:

Dockerfile
   -> Build
Docker Image
   -> Run
Docker Container

Meaning:
- Dockerfile defines how the image is built.
- Build creates an immutable Docker image.
- Run creates a running container instance.

Audience:
Software developers learning Docker.

Requirements:
- modern
- clean
- visually polished
- minimal text
- strong hierarchy
- suitable for motion/video
- not a generic SaaS UI

Do not write code.`;

async function runExperimentA(): Promise<any> {
  console.log("\n=======================================================");
  console.log("RUNNING EXPERIMENT A — NO SKILL (BASELINE)");
  console.log("=======================================================");

  const prompt = `${CORE_TASK_PROMPT}

Produce ONE detailed visual design direction covering:
1. Composition & layout
2. Visual representation of Dockerfile
3. Visual representation of Docker Image
4. Visual representation of Docker Container
5. Visual metaphor for Build process
6. Visual metaphor for Run process
7. Typography system
8. Color logic and palette`;

  const requestBody = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: TEMPERATURE
  };

  const start = Date.now();
  const response = await sendChatRequest(requestBody);
  const latency = Date.now() - start;

  const content = response.choices?.[0]?.message?.content;
  console.log(`Experiment A finished in ${latency}ms.`);
  return {
    experiment: "A",
    model: MODEL,
    temperature: TEMPERATURE,
    request: requestBody,
    response,
    finalResponse: content
  };
}

async function runExperimentWithSkill(
  experimentId: "B" | "C",
  targetSkill: "ui-styling" | "design-system",
  customGuidance: string
): Promise<any> {
  console.log("\n=======================================================");
  console.log(`RUNNING EXPERIMENT ${experimentId} — ${targetSkill.toUpperCase()}`);
  console.log("=======================================================");

  const prompt = `${CORE_TASK_PROMPT}

Use the installed ${targetSkill} Skill as your visual-design methodology.

${customGuidance}

Before answering, you MUST use the provided tools to read ${targetSkill} and any relevant references inside it.

Then produce ONE detailed visual design direction covering:
1. Composition & layout
2. Visual representation of Dockerfile
3. Visual representation of Docker Image
4. Visual representation of Docker Container
5. Visual metaphor for Build process
6. Visual metaphor for Run process
7. Typography system
8. Color logic and palette
9. Specific methodology principles applied from the read Skill`;

  const messages: any[] = [{ role: "user", content: prompt }];
  const filesRead: string[] = [];
  const toolExecutions: any[] = [];
  let turn = 0;
  const maxToolTurns = 3;
  let finalContent: string | null = null;

  while (turn < maxToolTurns) {
    turn++;
    console.log(`[Turn ${turn}] Requesting with tools enabled...`);

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
      console.log(`[Turn ${turn}] Model provided final response directly in ${latency}ms.`);
      finalContent = message?.content;
      messages.push(message);
      break;
    }
  }

  // Synthesize final response
  if (!finalContent) {
    console.log(`[Synthesis Turn] Generating final visual design direction with all tool results in context...`);
    messages.push({
      role: "user",
      content: `You have retrieved and read the ${targetSkill} Skill files. Now, following strictly the design philosophy, composition, and visual guidelines from the Skill, write your complete and detailed visual design direction covering items 1 through 9.`
    });

    const synthesisBody: any = {
      model: MODEL,
      messages,
      temperature: TEMPERATURE
    };

    const start = Date.now();
    const response = await sendChatRequest(synthesisBody);
    const latency = Date.now() - start;
    console.log(`[Synthesis Turn] Final response generated in ${latency}ms.`);

    const choice = response.choices?.[0];
    finalContent = choice?.message?.content;
    messages.push(choice?.message);
  }

  return {
    experiment: experimentId,
    skill: targetSkill,
    model: MODEL,
    temperature: TEMPERATURE,
    filesRead: Array.from(new Set(filesRead)),
    toolExecutions,
    finalResponse: finalContent
  };
}

async function main() {
  console.log("=== BIFROST DESIGN QUALITY BENCHMARK (A / B / C) ===");

  // 1. Experiment A: No Skill
  const expA = await runExperimentA();

  // 2. Experiment B: UI-Styling
  const expBGuidance = `For this task, focus specifically on any guidance related to:
- canvas / visual design (references/canvas-design-system.md)
- composition
- hierarchy
- visual storytelling
- typography
- spacing
- color
- iconography
- information density

Do not use website/application UI patterns unless they genuinely serve the graphic.
Do not use slide copywriting formulas.`;
  const expB = await runExperimentWithSkill("B", "ui-styling", expBGuidance);

  // 3. Experiment C: Design-System
  const expCGuidance = `For this task, focus specifically on any guidance related to:
- token architecture (primitive, semantic, component)
- systematic visual consistency
- hierarchy and state representations
- typography and spacing scales
- color system logic

Do not use slide copywriting formulas.`;
  const expC = await runExperimentWithSkill("C", "design-system", expCGuidance);

  const output = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    temperature: TEMPERATURE,
    expA,
    expB,
    expC
  };

  const outputPath = "/home/hany/webserver/server/www/karve/experiments/design-quality-benchmark-results.json";
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n=======================================================`);
  console.log(`BENCHMARK COMPLETE. Results saved to: ${outputPath}`);
  console.log(`=======================================================`);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
