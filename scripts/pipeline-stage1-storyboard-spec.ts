import * as fs from "fs";
import * as path from "path";

const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
const BIFROST_AUTH_TOKEN = process.env.BIFROST_AUTH_TOKEN || "sk-bf-1e5e5585-ff41-4407-8f73-8cc7b0dadcbb";
const MODEL = "bedrock/qwen.qwen3-235b-a22b-2507-v1:0";
const EXPERIMENT_DIR = "/home/hany/webserver/server/www/karve/experiments/db-index-explainer";

async function sendChat(messages: any[]): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BIFROST_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${BIFROST_AUTH_TOKEN}`;
  }
  const body = {
    model: MODEL,
    messages,
    temperature: 0.2
  };
  const res = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bifrost HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("=== COMPLETING STORYBOARD & VISUAL SPEC VIA BIFROST ===");
  const cdPath = path.join(EXPERIMENT_DIR, "creative-direction.json");
  const creativeDirection = JSON.parse(fs.readFileSync(cdPath, "utf-8"));

  // 1. Generate Storyboard
  console.log("Generating storyboard.json from approved Creative Direction...");
  const sbPrompt = `You are the Senior Information Designer & Technical Visual Art Director.
Using the following approved Creative Direction for "WHY DATABASE INDEXES MAKE QUERIES FAST":

${JSON.stringify(creativeDirection, null, 2)}

Create the complete storyboard for approximately 30 seconds (30 FPS, 900 frames total).
The director decides the exact number of semantic beats (aim for 5 to 7 meaningful beats).

Progression:
1. Problem: Query arrives ("SELECT * FROM users WHERE id = 77;")
2. Expensive Scan: Full Table Scan checks rows sequentially (slow, O(N))
3. Introduction of Index: Separate ordered B-tree structure appears
4. Narrowing Search: B-tree traversal progressively eliminates branches (O(log N))
5. Direct Row Lookup: Leaf pointer points directly to target row in table
6. Comparison & Trade-off: Fast reads (3 hops vs N) with write/storage cost

Output ONLY a single valid JSON code block:
\`\`\`json
{
  "total_duration_sec": 30,
  "total_frames": 900,
  "fps": 30,
  "beats": [
    {
      "beat_number": 1,
      "name": "...",
      "start_time_sec": 0,
      "end_time_sec": 4.5,
      "start_frame": 0,
      "end_frame": 135,
      "teaching_message": "...",
      "primary_visual_focus": "...",
      "objects_visible": ["..."],
      "visual_job": "orient",
      "transition": "...",
      "continuity_from_previous": "...",
      "why_visual_improves_understanding": "...",
      "on_screen_text": "..."
    }
  ]
}
\`\`\``;

  const sbResp = await sendChat([
    { role: "system", content: "You are an expert technical director. Output strictly valid JSON." },
    { role: "user", content: sbPrompt }
  ]);
  const sbText = sbResp.choices?.[0]?.message?.content || "";
  const sbMatch = sbText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, sbText];
  const storyboard = JSON.parse(sbMatch[1].trim());

  const sbFile = path.join(EXPERIMENT_DIR, "storyboard.json");
  fs.writeFileSync(sbFile, JSON.stringify(storyboard, null, 2));
  console.log(`Saved: ${sbFile}`);

  // 2. Generate Visual Spec
  console.log("Generating visual-spec.json from approved Creative Direction & Storyboard...");
  const vsPrompt = `You are the Technical Visual Art Director.
Convert the approved Creative Direction and Storyboard into an implementation-ready visual specification for Remotion (1920x1080 @ 30 FPS).
Do not leave design decisions for the Remotion developer.

Creative Direction:
${JSON.stringify(creativeDirection, null, 2)}

Storyboard Beats:
${JSON.stringify(storyboard.beats.map((b: any) => ({ beat: b.beat_number, name: b.name, frames: [b.start_frame, b.end_frame] })), null, 2)}

Define concrete values for:
- canvas (width: 1920, height: 1080, fps: 30, duration_in_frames: 900)
- background (color, grid size, grid opacity)
- palette (exact hex codes and rgba tints)
- typography (families, weights, font sizes for title, labels, query, metrics)
- geometry of table:
  - position (x, y, width, height)
  - row items: count (16 rows), ids: [4, 9, 15, 23, 31, 42, 48, 55, 63, 71, 77, 82, 89, 93, 97, 99], box size (80x64), spacing (20), border_radius, stroke_width
  - target_row: id 77, index 10
- geometry of B-tree index:
  - root: { id: "root", keys: [50], x: 960, y: 220, width: 140, height: 60 }
  - level_1: [
      { id: "node_L1_1", keys: [25], x: 640, y: 340, width: 120, height: 54 },
      { id: "node_L1_2", keys: [75], x: 1280, y: 340, width: 120, height: 54 }
    ]
  - leaves (level_2): [
      { id: "leaf_1", keys: [4, 15], x: 440, y: 460, width: 120, height: 50 },
      { id: "leaf_2", keys: [31, 42], x: 740, y: 460, width: 120, height: 50 },
      { id: "leaf_3", keys: [55, 63], x: 1120, y: 460, width: 120, height: 50 },
      { id: "leaf_4", keys: [77, 89], x: 1420, y: 460, width: 130, height: 50 }
    ]
  - connectors: list of line connections from parent to child with coordinates
  - pointer_beam: start (x: 1450, y: 510) to target row in table
- query banner: position, size, styling, text: "SELECT * FROM users WHERE id = 77;"
- comparison HUD / counter:
  - scan counter (increments 1 to 11 in unindexed scan, or displays "1,000,000 rows scanned")
  - index counter (shows "3 B-tree hops")
- trade-off card / footer:
  - "INDEX TRADE-OFF: Reads: O(log N) ⚡ | Writes & Storage: +Cost 💾"
- visual states (idle, scanning, rejected, active_path, matched)

Output ONLY a single valid JSON code block:
\`\`\`json
{
  "canvas": { ... },
  "background": { ... },
  "palette": { ... },
  "typography": { ... },
  "layout": { ... },
  "table_spec": { ... },
  "btree_spec": { ... },
  "connector_spec": { ... },
  "pointer_spec": { ... },
  "query_banner": { ... },
  "metrics_spec": { ... },
  "tradeoff_spec": { ... },
  "visual_states": { ... }
}
\`\`\``;

  const vsResp = await sendChat([
    { role: "system", content: "You are an expert visual specification designer. Output strictly valid JSON." },
    { role: "user", content: vsPrompt }
  ]);
  const vsText = vsResp.choices?.[0]?.message?.content || "";
  const vsMatch = vsText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, vsText];
  const visualSpec = JSON.parse(vsMatch[1].trim());

  const vsFile = path.join(EXPERIMENT_DIR, "visual-spec.json");
  fs.writeFileSync(vsFile, JSON.stringify(visualSpec, null, 2));
  console.log(`Saved: ${vsFile}`);
  console.log("Stage 1 complete!");
}

main().catch(err => {
  console.error("Error in storyboard/spec:", err);
  process.exit(1);
});
