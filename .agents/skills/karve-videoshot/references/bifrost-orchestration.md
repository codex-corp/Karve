# Karve VideoShot — Bifrost & Skill Tool-Calling Orchestration

This document formalizes the exact tool-calling pattern and execution harness used to expose locally installed skills to downstream models (e.g. `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`) via the local Bifrost gateway (`http://127.0.0.1:10020`).

---

## 1. The Core Principle: Skills Are Tools, Not Prompts

Merely prompting a model with `"Use the ui-styling skill"` fails because the model relies on stale training data or hallucinations of what the skill might contain.

**The model must physically inspect and read the installed skill files via tool calls** before generating specifications or code.

The execution loop enforces this:
```text
Karve Orchestrator
        │ (Bifrost POST /v1/chat/completions with tools)
        ▼
Downstream Model (Qwen via Bifrost)
        │ returns tool_calls: [ { name: "read_skill", args: { skill: "ui-styling" } } ]
        ▼
Karve Tool Executor
        │ validates allowed skills, resolves canonical path, reads file
        ▼
Tool Message Return
        │ { role: "tool", tool_call_id: "...", content: "<SKILL.md contents>" }
        ▼
Downstream Model
        │ continues reasoning, reads further references or produces final JSON
        ▼
Stage Artifact Saved
```

---

## 2. The Tool Interface & Schemas

The Bifrost endpoint exposes three standard tools to the downstream model:

```typescript
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
            description: "The name of the skill (e.g. 'ui-styling', 'diagram-design', 'motion-design')"
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
            description: "Relative path inside the skill directory (e.g. 'references/canvas-design-system.md' or 'director/choreography.md')"
          }
        },
        required: ["skill", "file_path"]
      }
    }
  }
];
```

---

## 3. Stage-Gated Access Control (`ALLOWED_SKILLS`)

To prevent models from reading unauthorized or irrelevant skills (which pollutes context and causes stylistic drift), the orchestrator strictly enforces stage-specific whitelists:

```typescript
// Stage B: Creative Direction
const ALLOWED_SKILLS = ["ui-styling", "diagram-design", "editorial-infographics"];

// Stage E: Motion Direction
const ALLOWED_SKILLS = ["motion-design", "video-talkcraft"];

// Stage F: Remotion Implementation
const ALLOWED_SKILLS = ["remotion-best-practices", "remotion-markup", "svg-skill"];
```

If the model requests an unrouted skill:
```typescript
if (!ALLOWED_SKILLS.includes(skill)) {
  return {
    content: "",
    error: `Skill '${skill}' is not routed to this stage. Allowed skills: ${ALLOWED_SKILLS.join(", ")}`
  };
}
```

---

## 4. Hardened Path Security & Containment (No Symlink Escape / Path Traversal)

Simple prefix checks like `resolved.startsWith(skillDir)` are vulnerable to prefix collisions (e.g. `/path/to/skill-evil` vs `/path/to/skill`) and symlink escapes.

All file reads must enforce canonical containment using `fs.realpathSync` and `path.relative`:

```typescript
import * as fs from "fs";
import * as path from "path";

const SKILLS_ROOT = "/home/hany/ai-skills";

export function readSecureSkillFile(skill: string, relPath: string): string {
  // 1. Resolve canonical skills root
  const canonicalSkillsRoot = fs.realpathSync(SKILLS_ROOT);

  // 2. Resolve and canonicalize skill directory
  const rawSkillDir = path.join(canonicalSkillsRoot, skill);
  if (!fs.existsSync(rawSkillDir)) {
    throw new Error(`Skill directory does not exist: '${skill}'`);
  }
  const canonicalSkillDir = fs.realpathSync(rawSkillDir);

  // Verify skill directory is strictly inside canonicalSkillsRoot (prevent prefix collision & escape)
  const relSkillToRoot = path.relative(canonicalSkillsRoot, canonicalSkillDir);
  if (relSkillToRoot.startsWith("..") || path.isAbsolute(relSkillToRoot)) {
    throw new Error(`Skill directory escapes root: '${skill}'`);
  }

  // 3. Resolve and canonicalize requested target file
  const candidateFile = path.resolve(canonicalSkillDir, relPath);
  if (!fs.existsSync(candidateFile)) {
    throw new Error(`File not found: '${relPath}' in skill '${skill}'`);
  }
  const canonicalFile = fs.realpathSync(candidateFile);

  // Verify target file is strictly inside canonicalSkillDir
  const relFileToSkill = path.relative(canonicalSkillDir, canonicalFile);
  if (relFileToSkill.startsWith("..") || path.isAbsolute(relFileToSkill)) {
    throw new Error(`Path traversal / symlink escape detected for '${relPath}' in '${skill}'`);
  }

  // Read-only access
  return fs.readFileSync(canonicalFile, "utf-8");
}
```

---

## 5. Multi-Turn Conversation Loop Implementation

The Bifrost chat completion API requires preserving assistant tool-call messages and matching every `tool_call_id` with its corresponding `tool` role response:

```typescript
async function runSkillToolLoop(systemPrompt: string, userPrompt: string, allowedSkills: string[], maxTurns = 8) {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  let turns = 0;
  while (turns < maxTurns) {
    turns++;
    const response = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BIFROST_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        model: "bedrock/qwen.qwen3-235b-a22b-2507-v1:0",
        messages,
        temperature: 0.3,
        tools,
        tool_choice: "auto"
      })
    }).then(r => r.json());

    const choice = response.choices?.[0];
    if (!choice) break;

    const message = choice.message;
    messages.push(message);

    // If the model finished without calling more tools, extract output
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }

    // Process tool calls
    for (const call of message.tool_calls) {
      const toolName = call.function.name;
      const args = JSON.parse(call.function.arguments);
      let content = "";
      try {
        if (!allowedSkills.includes(args.skill)) {
          throw new Error(`Skill '${args.skill}' is not allowed in this stage.`);
        }
        if (toolName === "read_skill") {
          content = readSecureSkillFile(args.skill, "SKILL.md");
        } else if (toolName === "read_skill_file") {
          content = readSecureSkillFile(args.skill, args.file_path);
        } else if (toolName === "list_skill_files") {
          content = listSecureSkillFiles(args.skill);
        }
        recordSkillUsage(args.skill, toolName, args.file_path || "SKILL.md", call.id);
      } catch (err: any) {
        content = `Error: ${err.message}`;
      }

      // Append tool result with matching tool_call_id
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content
      });
    }
  }

  throw new Error(`Tool loop exceeded maximum allowed turns (${maxTurns})`);
}
```

---

## 6. Context Separation Between Stages

**Never chain all stages in a single continuous conversation history.**

Each major stage must start with a **FRESH context**:
- **Stage B (Creative Direction)**: Fresh context. Focuses purely on visual concept, spatial zones, visual language, and palette.
- **Stage C (Semantic Storyboard)**: Fresh context. Focuses purely on continuous beats, timing, and visual jobs.
- **Stage D (Visual Specification)**: Fresh context. Converts approved creative direction and storyboard into concrete geometric coordinates and typography tokens.
- **Stage E (Motion Direction)**: Fresh context. Converts storyboard and visual spec into deterministic frame choreography.
- **Stage F (Implementation)**: Fresh context. Converts specs into pure Remotion/SVG code.
- **Stage H & I (QA & Correction)**: Fresh context. Receives rendered keyframe stills and executes targeted defect fixes.

This isolation prevents token exhaustion, eliminates stylistic drift, and ensures downstream models cannot casually redesign earlier architectural decisions.

---

## 7. Audit Logging: `skill-usage.json`

Every tool call and file read is recorded into `skill-usage.json` for governance, reproducibility, and tracking model compliance:

```json
[
  {
    "stage": "Creative Direction",
    "bifrost_model": "bedrock/qwen.qwen3-235b-a22b-2507-v1:0",
    "skill_requested": "ui-styling",
    "skill_files_actually_read": [
      "SKILL.md",
      "references/canvas-design-system.md"
    ],
    "tool_call_ids": [
      "call_qwen_stage1_001",
      "call_qwen_stage1_002"
    ],
    "timestamp": "2026-09-03T10:45:12.345Z"
  }
]
```
