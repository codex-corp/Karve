import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN || "sk-bf-1e5e5585-ff41-4407-8f73-8cc7b0dadcbb";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/ai-skills";
const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";

const ALLOWED_SKILLS = ["motion-design", "video-talkcraft"];

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
            description: "The name of the skill ('motion-design' or 'video-talkcraft')"
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
            description: "Relative path inside the skill directory (e.g. 'director/choreography.md' or 'reference/timing-easing-tables.md')"
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
    (e: any) => e.stage === "Motion Direction" && e.skill_requested === skill
  );
  if (!entry) {
    entry = {
      stage: "Motion Direction",
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
  console.log("=== STAGE 2: MOTION DIRECTION ===");
  console.log(`Model: ${MODEL}`);

  const suPath = path.join(EXPERIMENT_DIR, "skill-usage.json");
  let skillUsageHistory: any[] = [];
  if (fs.existsSync(suPath)) {
    skillUsageHistory = JSON.parse(fs.readFileSync(suPath, "utf-8"));
  }

  const storyboard = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "storyboard.json"), "utf-8"));
  const visualSpec = JSON.parse(fs.readFileSync(path.join(EXPERIMENT_DIR, "visual-spec.json"), "utf-8"));

  const systemPrompt = `You are a Senior Motion Designer for high-end technical educational videos.
You are defining the deterministic motion choreography, frame ranges, easings, and semantic transitions for a 30-second video:
"WHY DATABASE INDEXES MAKE QUERIES FAST" (1920x1080 @ 30 FPS, 900 frames total).

Inputs provided:
- storyboard.json
- visual-spec.json

CRITICAL TOOL REQUIREMENT:
Before designing the motion spec, you MUST call the provided tools to read:
1. motion-design (SKILL.md)
2. Its relevant motion references (e.g. director/choreography.md, reference/timing-easing-tables.md, patterns/entrance-exit.md).

MOTION PRINCIPLES TO FOLLOW:
- Motion must explain meaning, not just look flashy.
- Sequential scanning: Linear, rhythmic scanning across rows (frames 135-315) demonstrating the cumulative burden of O(N).
- Tree traversal: Stepped, logarithmic descent (root -> level 1 -> leaf), where rejected subtrees immediately dim to 30% opacity, showing dramatic search space reduction.
- Direct pointer lookup: A crisp, energized vector beam (or drawn stroke) shooting from the matched index leaf directly down to the physical table row 77, followed by a subtle confirmation pulse.
- Performance contrast: Split comparison demonstrating 3 hops vs hundreds/thousands of scans.
- Trade-off conclusion: Smooth, calm appearance of write/storage cost indicator.
- Avoid repetitive animation patterns like mindless fade-slide-up-spring loops.
- Use deterministic frame intervals compatible with Remotion (useCurrentFrame, interpolate, Easing.bezier).

DELIVERABLE:
After calling tools to read motion-design, produce motion-spec.json detailing every animated property, exact frame ranges [start_frame, end_frame], easing curve (bezier parameters), interpolation ranges, and semantic purpose.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Storyboard:\n${JSON.stringify(storyboard, null, 2)}\n\nVisual Spec:\n${JSON.stringify(visualSpec, null, 2)}\n\nPlease read motion-design and develop the deterministic motion specification.`
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

  // Request final clean JSON
  messages.push({
    role: "user",
    content: `Please output the complete motion specification formatted strictly as a single JSON code block:
\`\`\`json:motion-spec.json
{
  "total_frames": 900,
  "fps": 30,
  "easings": { ... },
  "beats_motion": [
    {
      "beat_number": 1,
      "name": "...",
      "frame_range": [0, 135],
      "choreography": [ ... ]
    },
    ...
  ],
  "pointer_animation": { ... },
  "tree_traversal_animation": { ... },
  "split_contrast_animation": { ... },
  "remotion_interpolation_recipes": { ... }
}
\`\`\``
  });

  console.log("\nRequesting final JSON extraction turn...");
  const finalResp = await sendChat(messages, false);
  const fullText = finalResp.choices?.[0]?.message?.content || "";

  const jsonMatch = fullText.match(/```(?:json)?(?::motion-spec\.json)?\s*([\s\S]*?)\s*```/i) || [null, fullText];
  let motionSpec: any;
  try {
    motionSpec = JSON.parse(jsonMatch[1].trim());
  } catch (e) {
    const m = fullText.match(/\{[\s\S]*?"beats_motion"[\s\S]*?\}/);
    if (m) motionSpec = JSON.parse(m[0]);
    else throw new Error("Failed to parse motion-spec.json from model response");
  }

  const msPath = path.join(EXPERIMENT_DIR, "motion-spec.json");
  fs.writeFileSync(msPath, JSON.stringify(motionSpec, null, 2));
  fs.writeFileSync(suPath, JSON.stringify(skillUsageHistory, null, 2));

  console.log(`Saved: ${msPath}`);
  console.log(`Updated: ${suPath}`);
  console.log("Stage 2 Motion Direction complete!");
}

main().catch(err => {
  console.error("Stage 2 Fatal Error:", err);
  process.exit(1);
});
