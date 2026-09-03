import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN || "sk-bf-1e5e5585-ff41-4407-8f73-8cc7b0dadcbb";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const SKILLS_ROOT = "/home/hany/ai-skills";
const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";

fs.mkdirSync(EXPERIMENT_DIR, { recursive: true });

const ALLOWED_SKILLS = ["ui-styling", "diagram-design", "editorial-infographics"];

interface SkillUsageEntry {
  stage: string;
  bifrost_model: string;
  skill_requested: string;
  skill_files_actually_read: string[];
  tool_call_ids: string[];
  timestamp: string;
}

const skillUsageHistory: SkillUsageEntry[] = [];

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
            description: "The name of the skill (e.g. 'ui-styling', 'diagram-design', 'editorial-infographics')"
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
            description: "The name of the skill (e.g. 'ui-styling', 'diagram-design', 'editorial-infographics')"
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
            description: "Relative path inside the skill directory (e.g. 'references/canvas-design-system.md' or 'references/type-tree.md')"
          }
        },
        required: ["skill", "file_path"]
      }
    }
  }
];

function executeTool(name: string, argsStr: string, callId: string): { content: string; error?: string } {
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
    recordUsage(skill, "list_skill_files", callId);
    return { content: JSON.stringify({ skill, files }, null, 2) };
  }

  if (name === "read_skill") {
    const skillMd = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      return { content: "", error: `SKILL.md not found in '${skill}'` };
    }
    recordUsage(skill, "SKILL.md", callId);
    return { content: fs.readFileSync(skillMd, "utf-8") };
  }

  if (name === "read_skill_file") {
    const relPath = args.file_path;
    const resolved = path.resolve(skillDir, relPath);
    if (!resolved.startsWith(skillDir) || !fs.existsSync(resolved)) {
      return { content: "", error: `File '${relPath}' not found in '${skill}'` };
    }
    recordUsage(skill, relPath, callId);
    return { content: fs.readFileSync(resolved, "utf-8") };
  }

  return { content: "", error: `Unknown tool: ${name}` };
}

function recordUsage(skill: string, filePath: string, callId: string) {
  let entry = skillUsageHistory.find(
    e => e.stage === "Creative Direction" && e.skill_requested === skill
  );
  if (!entry) {
    entry = {
      stage: "Creative Direction",
      bifrost_model: MODEL,
      skill_requested: skill,
      skill_files_actually_read: [],
      tool_call_ids: [],
      timestamp: new Date().toISOString()
    };
    skillUsageHistory.push(entry);
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
    temperature: 0.3
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
  console.log("=== STAGE 1: CREATIVE DIRECTION, STORYBOARD, VISUAL SPEC ===");
  console.log(`Model: ${MODEL}`);

  const systemPrompt = `You are a Senior Information Designer & Technical Visual Art Director for high-end technical explainers.
Your role is to establish an uncompromisingly clear, elegant, and pedagogically sound visual design direction, storyboard, and visual specification for a 30-second technical explainer video.

TOPIC: WHY DATABASE INDEXES MAKE QUERIES FAST
Format: 1920x1080, 16:9, 30 FPS, ~30 seconds (900 frames).
Audience: Software developers who understand basic SQL.

Teaching Goals:
1. Without an index, finding a row can require scanning many rows (Full Table Scan O(N)).
2. An index is a separate ordered/search structure (e.g. B-Tree index on a column).
3. A B-tree-like structure progressively narrows the search space (O(log N)).
4. The index leaf points directly toward the relevant table row(s) (pointer/RowID lookup).
5. Indexes dramatically accelerate reads but have storage and write/maintenance costs.

CRITICAL INSTRUCTIONS ON TOOL CALLING:
Before generating the design, you MUST call the provided tools to inspect and read:
1. ui-styling (SKILL.md) and its canvas design reference (references/canvas-design-system.md).
2. diagram-design (SKILL.md) and its relevant diagram reference(s) for trees, databases, or semantic patterns (e.g. references/type-tree.md, references/type-db-schema.md, references/semantic-patterns.md).

Do not claim to have read these skills without actually calling the tools!

VISUAL DESIGN CONSTRAINTS:
Avoid defaulting to:
- Generic UI cards
- Generic dashboards
- Three boxes with arrows
- Glassmorphism
- Gratuitous gradients
- Sci-fi holograms
- Generic floating particles
- Arbitrary 3D
Every visual element must serve intuitive understanding.

DELIVERABLE OUTPUT REQUIREMENTS:
After consulting the skills via tool calls, produce THREE clear, comprehensive JSON artifacts embedded in code blocks or clearly structured:
1. creative-direction.json:
   - narrative structure
   - visual concept & metaphor
   - visual language & aesthetic rules
   - composition & spatial layout (1920x1080 canvas)
   - visual hierarchy
   - palette (exact semantic color tokens)
   - typography (families, weights, purpose)
   - representations of: database table, rows, sequential scan, index structure, tree search narrowing, pointer/lookup link, performance contrast/trade-offs.
2. storyboard.json:
   - sequence of semantic beats covering 0 to 30 seconds (~900 frames)
   - for each beat: start_time_sec, end_time_sec, start_frame, end_frame, teaching_message, primary_visual_focus, objects_visible, visual_job (orient, explain, demonstrate, compare, prove, emphasize, transition), transition_type, continuity_from_previous, why_visual_improves_understanding.
3. visual-spec.json:
   - concrete implementation-ready values for Remotion:
     - canvas (1920x1080, 30 fps, 900 frames)
     - background colors / grid / subtle coordinate system
     - color tokens (hex values, semantic roles)
     - typography specs (font sizes, line heights, weights)
     - stroke widths, line styles, corner radii
     - object geometries, positions (x, y, w, h), margins, padding
     - connector geometries, arrowheads, pointer rays
     - visual states (unfocused, scanning, rejected, matched, active branch, eliminated branch)
     - data values used in the demo (e.g., table with IDs and values, target query like "WHERE id = 77")`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Begin by exploring and reading the required skills (ui-styling and diagram-design references), then develop the creative direction, 30-second storyboard, and complete visual specification.`
    }
  ];

  let turns = 0;
  const maxTurns = 12;

  while (turns < maxTurns) {
    turns++;
    console.log(`\n--- Turn ${turns} ---`);
    const resp = await sendChat(messages, true);
    const choice = resp.choices?.[0];
    const msg = choice?.message;
    if (!msg) {
      console.error("Empty response choice");
      break;
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log(`Model requested ${msg.tool_calls.length} tool calls:`);
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const fnName = tc.function?.name;
        const fnArgs = tc.function?.arguments;
        console.log(`  -> ${fnName}(${fnArgs})`);
        const res = executeTool(fnName, fnArgs, tc.id);
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

  // If the model hasn't provided all 3 JSONs explicitly, do one more turn asking to emit them cleanly
  const lastContent = messages[messages.length - 1].content || "";
  console.log("\nReviewing model output length:", lastContent.length);

  // Let's ask the model to ensure all three JSON artifacts are strictly extracted and formatted
  messages.push({
    role: "user",
    content: `Thank you. Now please output the three final approved artifacts formatted in distinct JSON code blocks with headers:
\`\`\`json:creative-direction.json
...
\`\`\`
\`\`\`json:storyboard.json
...
\`\`\`
\`\`\`json:visual-spec.json
...
\`\`\`
Make sure all JSON is 100% valid, thoroughly detailed, and contains all required concrete coordinates, colors, timings, and values.`
  });

  console.log("\nRequesting final JSON extraction turn...");
  const finalResp = await sendChat(messages, false);
  const finalMsg = finalResp.choices?.[0]?.message;
  const fullText = finalMsg?.content || "";
  console.log("Final turn response received, length:", fullText.length);

  // Helper to extract JSON block by name or fallback regex
  function extractJson(text: string, label: string): any {
    // Try ```json:label ... ```
    const taggedRegex = new RegExp(`\`\`\`json:${label}[\\s\\S]*?\\n([\\s\\S]*?)\`\`\``, "i");
    const taggedMatch = text.match(taggedRegex);
    if (taggedMatch) {
      try {
        return JSON.parse(taggedMatch[1]);
      } catch (e) {
        console.warn(`Failed to parse tagged block for ${label}`);
      }
    }

    // Try generic ```json ... ``` blocks
    const codeBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (label === "creative-direction" && (parsed.visual_concept || parsed.narrative_structure || parsed.creative_direction)) {
          return parsed;
        }
        if (label === "storyboard" && (Array.isArray(parsed) || parsed.beats || parsed.storyboard)) {
          return parsed;
        }
        if (label === "visual-spec" && (parsed.canvas || parsed.palette || parsed.typography || parsed.visual_spec)) {
          return parsed;
        }
      } catch (e) {}
    }

    return null;
  }

  let creativeDirection = extractJson(fullText, "creative-direction.json") || extractJson(lastContent, "creative-direction.json");
  let storyboard = extractJson(fullText, "storyboard.json") || extractJson(lastContent, "storyboard.json");
  let visualSpec = extractJson(fullText, "visual-spec.json") || extractJson(lastContent, "visual-spec.json");

  // Fallbacks if not perfectly matched
  if (!creativeDirection) {
    console.log("Attempting fallback parse for creative-direction...");
    // Find json object with visual_concept
    const m = fullText.match(/\{[\s\S]*?"visual_concept"[\s\S]*?\}/);
    if (m) creativeDirection = JSON.parse(m[0]);
  }

  const cdPath = path.join(EXPERIMENT_DIR, "creative-direction.json");
  const sbPath = path.join(EXPERIMENT_DIR, "storyboard.json");
  const vsPath = path.join(EXPERIMENT_DIR, "visual-spec.json");
  const suPath = path.join(EXPERIMENT_DIR, "skill-usage.json");

  fs.writeFileSync(cdPath, JSON.stringify(creativeDirection, null, 2));
  fs.writeFileSync(sbPath, JSON.stringify(storyboard, null, 2));
  fs.writeFileSync(vsPath, JSON.stringify(visualSpec, null, 2));
  fs.writeFileSync(suPath, JSON.stringify(skillUsageHistory, null, 2));

  console.log(`Saved: ${cdPath}`);
  console.log(`Saved: ${sbPath}`);
  console.log(`Saved: ${vsPath}`);
  console.log(`Saved: ${suPath}`);
}

main().catch(err => {
  console.error("Stage 1 Fatal Error:", err);
  process.exit(1);
});
