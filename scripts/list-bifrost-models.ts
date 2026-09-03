import { listModels } from "../src/p4/bifrost-provider.ts";

async function main() {
  const baseUrl = process.env.BIFROST_BASE_URL || "http://127.0.0.1:10020";
  const token = process.env.BIFROST_AUTH_TOKEN;

  console.log(`==> Fetching models from Bifrost: ${baseUrl}`);
  try {
    const models = await listModels(baseUrl, token, 10000);
    console.log(`Total models advertised: ${models.length}`);
    
    const bedrockModels = models.filter((m: any) => {
      const id = typeof m === "string" ? m : m.id;
      return id && (id.includes("bedrock") || id.includes("anthropic") || id.includes("qwen") || id.includes("nova") || id.includes("amazon"));
    });

    console.log("\n=== ALL ADVERTISED BEDROCK / ROUTED MODELS ===");
    for (const m of models) {
      const id = typeof m === "string" ? m : m.id;
      console.log(`- ${id}`);
    }
  } catch (err) {
    console.error("Error querying Bifrost:", err);
    process.exit(1);
  }
}

main();
