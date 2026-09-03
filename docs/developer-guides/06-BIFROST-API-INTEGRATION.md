# Bifrost API Integration & Tool Calling Guide

This document serves as the canonical reference for communicating with the local **Bifrost AI Gateway** within the Karve ecosystem. It explains the gateway architecture, API endpoints, structured JSON schemas, dynamic tool-calling patterns, and skill-injection workflows used in Karve (P4 edit planning, P6-B caption correction, and P7 visual direction).

---

## 1. Overview & Architecture

Bifrost acts as the unified, local-first LLM gateway boundary for Karve.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KARVE PIPELINE                                │
│                                                                         │
│   P4 (Edit Plan) ──┐                                                    │
│   P6-B (Captions) ─┼──► [HTTP /v1/chat/completions]                     │
│   P7 (Visual Dir) ─┘                 │                                  │
└──────────────────────────────────────┼──────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCAL BIFROST GATEWAY (Port 10020)                   │
│                                                                         │
│  - OpenAI-compatible API surface                                        │
│  - Local loopback: http://127.0.0.1:10020                               │
│  - Weighted routing, rate limiting, and telemetry                       │
└──────────────────────────────────────┬──────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        UPSTREAM MODEL PROVIDERS                         │
│                                                                         │
│  Default Quality Model: bedrock/qwen.qwen3-235b-a22b-2507-v1:0          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Rules
1. **Single LLM Boundary:** Karve components must **never** call Bedrock or external AI providers directly; all LLM traffic routes through Bifrost.
2. **Deterministic Schemas:** All production pipeline stages must enforce strict response schemas or structured output formats.
3. **Default Model:** `bedrock/qwen.qwen3-235b-a22b-2507-v1:0`.

---

## 2. Gateway Endpoints & Network Configuration

- **Default Base URL:** `http://127.0.0.1:10020` (overridable via `BIFROST_BASE_URL`).
- **Auth Token:** Optional `BIFROST_AUTH_TOKEN` (passed as `Authorization: Bearer <token>`).

### Health & Discovery Endpoints

#### 1. Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "components": { "db_pings": "ok" }
}
```

#### 2. List Models
```http
GET /v1/models
```
**Response:**
```json
{
  "object": "list",
  "data": [
    { "id": "bedrock/qwen.qwen3-235b-a22b-2507-v1:0", "object": "model" },
    { "id": "bedrock/qwen.qwen3-coder-480b-a35b-v1:0", "object": "model" }
  ]
}
```

---

## 3. Communication Patterns

### Pattern A: Structured JSON Completion (P4 / P6-B)

Used for deterministic data processing like edit planning and subtitle correction.

```typescript
const requestBody = {
  model: "bedrock/qwen.qwen3-235b-a22b-2507-v1:0",
  messages: [
    { role: "system", content: "You are a precise video editor. Respond in valid JSON." },
    { role: "user", content: "Analyze the transcript and provide edit cuts." }
  ],
  response_format: { type: "json_object" },
  temperature: 0.1
};

const res = await fetch("http://127.0.0.1:10020/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestBody)
});
```

---

### Pattern B: Dynamic Skill Tool-Calling (P7 Visual Director)

Allows downstream models to autonomously read installed project skills (such as `ui-styling` or `video-talkcraft`) to extract visual design rules without bloating prompts.

#### 1. Tool Definitions Sent to Bifrost
```json
[
  {
    "type": "function",
    "function": {
      "name": "read_skill",
      "description": "Read the main instructions (SKILL.md) of an installed design skill.",
      "parameters": {
        "type": "object",
        "properties": {
          "skill": {
            "type": "string",
            "description": "The name of the skill (e.g. 'ui-styling')"
          }
        },
        "required": ["skill"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "read_skill_file",
      "description": "Read a reference or template file belonging to an installed skill.",
      "parameters": {
        "type": "object",
        "properties": {
          "skill": { "type": "string" },
          "file_path": {
            "type": "string",
            "description": "Relative path inside the skill directory (e.g. 'references/canvas-design-system.md')"
          }
        },
        "required": ["skill", "file_path"]
      }
    }
  }
]
```

#### 2. First Turn (Model Emits Tool Call)
When prompted with tools enabled, Bifrost returns:
```json
{
  "choices": [
    {
      "finish_reason": "tool_calls",
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "tooluse_abc123",
            "type": "function",
            "function": {
              "name": "read_skill_file",
              "arguments": "{\"skill\":\"ui-styling\",\"file_path\":\"references/canvas-design-system.md\"}"
            }
          }
        ]
      }
    }
  ]
}
```

#### 3. Injecting the Tool Result
The client executes the tool locally (reading the file from disk) and appends:
1. The assistant message containing the `tool_calls`.
2. A new message with `role: "tool"`, matching `tool_call_id`, and the actual file content.

```json
[
  { "role": "user", "content": "Create visual direction..." },
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "tooluse_abc123",
        "type": "function",
        "function": {
          "name": "read_skill_file",
          "arguments": "{\"skill\":\"ui-styling\",\"file_path\":\"references/canvas-design-system.md\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "tooluse_abc123",
    "content": "# Canvas Design System\n\nVisual design philosophy, systematic composition..."
  }
]
```

#### 4. Final Synthesis Turn
Once reference retrieval is complete, trigger the final generation:
```json
{
  "role": "user",
  "content": "You have retrieved and read the required Skill files. Now, following strictly the design philosophy and visual guidelines from the Skill, write your complete and detailed visual design direction."
}
```

---

## 4. Complete Node.js / TypeScript Reference Implementation

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

export interface BifrostConfig {
  baseUrl: string;
  authToken?: string;
  model: string;
  timeoutMs?: number;
}

export class BifrostClient {
  private baseUrl: string;
  private token?: string;
  private model: string;
  private timeoutMs: number;

  constructor(config: BifrostConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.authToken;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs || 60000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token && this.token.trim() !== "") {
      h["Authorization"] = `Bearer ${this.token.trim()}`;
    }
    return h;
  }

  async chat(payload: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        ...payload
      }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Bifrost HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  }

  /**
   * Multi-turn autonomous tool execution loop for Skills
   */
  async runSkillGuidedCompletion(
    userPrompt: string,
    skillsRoot: string,
    toolsDefinition: any[],
    maxToolTurns = 3
  ): Promise<string> {
    const messages: any[] = [{ role: "user", content: userPrompt }];
    let turn = 0;
    let finalContent: string | null = null;

    while (turn < maxToolTurns) {
      turn++;
      const response = await this.chat({
        messages,
        tools: toolsDefinition,
        tool_choice: "auto",
        temperature: 0.3
      });

      const message = response.choices?.[0]?.message;
      const toolCalls = message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        messages.push(message);

        for (const tc of toolCalls) {
          const fnName = tc.function.name;
          const args = JSON.parse(tc.function.arguments);

          let result = "";
          if (fnName === "read_skill") {
            const p = path.join(skillsRoot, args.skill, "SKILL.md");
            result = fs.readFileSync(p, "utf8");
          } else if (fnName === "read_skill_file") {
            const p = path.join(skillsRoot, args.skill, args.file_path);
            result = fs.readFileSync(p, "utf8");
          }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result
          });
        }
      } else {
        finalContent = message?.content;
        break;
      }
    }

    if (!finalContent) {
      messages.push({
        role: "user",
        content: "You have read the required skill files. Now provide your final response."
      });
      const synthesis = await this.chat({ messages, temperature: 0.3 });
      finalContent = synthesis.choices?.[0]?.message?.content;
    }

    return finalContent || "";
  }
}
```

---

## 5. Best Practices & Guidelines for Karve Skills

1. **Skill Selection for Technical Motion / Art Direction:**
   - **Preferred:** `ui-styling` + `references/canvas-design-system.md` (inspires "Geometric Silence", spatial balance, `oklch` color spaces, and eliminates UI cards).
   - **Avoid for Video Graphics:** `design-system` / token tables (forces model into web-app button/card wireframes) and slide copywriting formulas (PAS/FAB).
2. **Bounded File Access:** Ensure tool implementations resolve paths strictly within the target skill directory to prevent path traversal.
3. **Deterministic Temperature:**
   - Structured JSON validation: `0.0` - `0.1`
   - Visual direction & creative planning: `0.2` - `0.3`
4. **Token Efficiency:** Do not paste raw multi-kilobyte skills into the prompt; let the model use `read_skill_file` to fetch only the reference documents it needs.
