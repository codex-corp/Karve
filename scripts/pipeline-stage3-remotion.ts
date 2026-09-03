import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN || "sk-bf-1e5e5585-ff41-4407-8f73-8cc7b0dadcbb";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/ai-skills";
const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";

const ALLOWED_SKILLS = ["remotion-best-practices", "remotion-markup", "svg-skill"];

const tools = [
  {
    type: "function",
    function: {
      name: "list_skill_files",
      description: "List all reference files and markdown documentation available inside an installed skill.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the skill ('remotion-best-practices', 'remotion-markup', or 'svg-skill')"
          }
        },
        required: ["skill"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_skill",
      description: "Read the main instructions (SKILL.md) of an installed skill.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the skill"
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
      description: "Read a specific reference or document file inside an installed skill.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The name of the skill"
          },
          file_path: {
            type: "string",
            description: "Relative path inside the skill directory (e.g. 'timing.md', 'compositions.md', 'reference.md')"
          }
        },
        required: ["skill", "file_path"]
      }
    }
  }
];

function executeTool(name: string, argsStr: string, callId: string, usageList: any[]): { content: string; error?: string } {
  let args: any;
  try {
    args = JSON.parse(argsStr);
  } catch (err: any) {
    return { content: "", error: `Invalid JSON arguments: ${err.message}` };
  }

  const skill = args.skill;
  if (!ALLOWED_SKILLS.includes(skill)) {
    return {
      content: "",
      error: `Skill '${skill}' is not routed to this stage. Allowed skills: ${ALLOWED_SKILLS.join(", ")}`
    };
  }

  const skillDir = path.join(SKILLS_ROOT, skill);
  if (!fs.existsSync(skillDir)) {
    return { content: "", error: `Skill directory '${skillDir}' not found` };
  }

  if (name === "list_skill_files") {
    function getFiles(dir: string, base: string = ""): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const rel = base ? `${base}/${file}` : file;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(getFiles(full, rel));
        } else {
          results.push(rel);
        }
      }
      return results;
    }
    const files = getFiles(skillDir);
    recordUsage(skill, "list_skill_files", callId, usageList);
    return { content: JSON.stringify({ skill, files }, null, 2) };
  }

  if (name === "read_skill") {
    const skillMd = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      return { content: "", error: `SKILL.md not found in '${skill}'` };
    }
    recordUsage(skill, "SKILL.md", callId, usageList);
    return { content: fs.readFileSync(skillMd, "utf-8") };
  }

  if (name === "read_skill_file") {
    const relPath = args.file_path;
    const resolved = path.resolve(skillDir, relPath);
    if (!resolved.startsWith(skillDir) || !fs.existsSync(resolved)) {
      return { content: "", error: `File '${relPath}' not found in '${skill}'` };
    }
    recordUsage(skill, relPath, callId, usageList);
    return { content: fs.readFileSync(resolved, "utf-8") };
  }

  return { content: "", error: `Unknown tool: ${name}` };
}

function recordUsage(skill: string, filePath: string, callId: string, usageList: any[]) {
  let entry = usageList.find(
    (e: any) => e.stage === "Remotion Implementation" && e.skill_requested === skill
  );
  if (!entry) {
    entry = {
      stage: "Remotion Implementation",
      bifrost_model: MODEL,
      skill_requested: skill,
      skill_files_actually_read: [],
      tool_call_ids: [],
      timestamp: new Date().toISOString()
    };
    usageList.push(entry);
  }
  if (!entry.skill_files_actually_read.includes(filePath)) {
    entry.skill_files_actually_read.push(filePath);
  }
  if (!entry.tool_call_ids.includes(callId)) {
    entry.tool_call_ids.push(callId);
  }
}

async function sendChat(messages: any[], useTools: boolean = true): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BIFROST_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${BIFROST_AUTH_TOKEN}`;
  }
  const body: any = {
    model: MODEL,
    messages,
    temperature: 0.2
  };
  if (useTools) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bifrost HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("=== STAGE 3: REMOTION IMPLEMENTATION ===");
  console.log(`Model: ${MODEL}`);

  const suPath = path.join(EXPERIMENT_DIR, "skill-usage.json");
  let skillUsageHistory: any[] = [];
  if (fs.existsSync(suPath)) {
    skillUsageHistory = JSON.parse(fs.readFileSync(suPath, "utf-8"));
  }

  const creativeDirection = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "creative-direction.json"), "utf-8"));
  const storyboard = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "storyboard.json"), "utf-8"));
  const visualSpec = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "visual-spec.json"), "utf-8"));
  const motionSpec = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "motion-spec.json"), "utf-8"));

  const systemPrompt = `You are the Lead Remotion Motion Graphics Developer.
You are implementing the complete, isolated Remotion video composition for:
"WHY DATABASE INDEXES MAKE QUERIES FAST" (1920x1080 @ 30 FPS, 900 frames total).

Inputs provided:
- creative-direction.json
- storyboard.json
- visual-spec.json
- motion-spec.json

CRITICAL TOOL REQUIREMENT:
Before writing code, you MUST call the provided tools to inspect and read:
1. remotion-best-practices (SKILL.md)
2. remotion-markup (SKILL.md and relevant docs like timing.md, compositions.md)
3. svg-skill (SKILL.md or reference.md)

IMPLEMENTATION DIRECTIVES:
- Preserve the exact approved design: paper/ink aesthetic, geometric vector clarity, exact colors (#f5f5f5, #2d3142, #4f5d75, #eb6c36), typography rules.
- Do NOT make it look like a web app. No generic cards, no UI buttons, no shadows, no glassmorphism.
- Use SVG vector geometry for precision:
  - Table shelf line and row rects (16 rows, target 77)
  - Full table scan pointer and scanning indicator
  - B-tree nodes with keys, clean SVG connectors
  - B-tree branch narrowing (active path vs dimmed/eliminated branches)
  - Direct pointer lookup ray from leaf [77] down to table row 77
  - Performance contrast HUD (3 hops vs N scans, O(log N) vs O(N))
  - Trade-off footer banner ("Reads: O(log N) ⚡ | Writes & Storage: +Cost 💾")
- Use deterministic Remotion APIs ONLY:
  - useCurrentFrame()
  - useVideoConfig()
  - interpolate() with proper extrapolateLeft / extrapolateRight: 'clamp'
  - Easing from 'remotion' (Easing.bezier, Easing.out, Easing.inOut)
  - Absolute positioning in 1920x1080 canvas
- React 19 + TypeScript compatible.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Please read remotion-best-practices, remotion-markup, and svg-skill via tool calls, then provide the complete, working React Remotion component code.`
    }
  ];

  let turns = 0;
  const maxTurns = 8;

  while (turns < maxTurns) {
    turns++;
    console.log(`\n--- Turn ${turns} ---`);
    const resp = await sendChat(messages, true);
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) break;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log(`Model requested ${msg.tool_calls.length} tool calls:`);
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const fnName = tc.function?.name;
        const fnArgs = tc.function?.arguments;
        console.log(`  -> ${fnName}(${fnArgs})`);
        const res = executeTool(fnName, fnArgs, tc.id, skillUsageHistory);
        if (res.error) {
          console.log(`     [Error] ${res.error}`);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: res.error })
          });
        } else {
          console.log(`     [Success] ${res.content.length} chars`);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: res.content
          });
        }
      }
    } else {
      console.log("\nModel produced content (no more tool calls).");
      messages.push(msg);
      break;
    }
  }

  // Update skill usage
  fs.writeFileSync(suPath, JSON.stringify(skillUsageHistory, null, 2));
  console.log(`Updated skill-usage.json with Remotion tools!`);
}

main().catch(err => {
  console.error("Stage 3 Fatal Error:", err);
  process.exit(1);
});
