import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { P7VisualJob, RepresentationKind } from "./types.ts";

export type CatalogCard = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  visual_jobs: P7VisualJob[];
  representation_kinds: RepresentationKind[];
  tags: string[];
  recipe_card_path: string;
  component_source_path?: string;
  demo_path?: string;
};

export type VisualCatalog = {
  discovered_at: string;
  catalog_source: string;
  catalog_fingerprint: string;
  total_cards: number;
  cards: CatalogCard[];
};

export type SearchQuery = {
  representation_kind?: RepresentationKind;
  visual_job?: P7VisualJob;
  keyword?: string;
  tags?: string[];
  limit?: number;
};

export type SearchResult = {
  card: CatalogCard;
  score: number;
  matched_reasons: string[];
};

export function resolveCatalogRoot(customPath?: string): string {
  if (customPath && existsSync(customPath)) {
    return resolve(customPath);
  }
  const envPath = process.env.KARVE_VIDEO_TALKCRAFT_ROOT;
  if (envPath && existsSync(envPath)) {
    return resolve(envPath);
  }
  const defaultRelative = resolve(process.cwd(), ".agents", "skills", "video-talkcraft");
  if (existsSync(defaultRelative)) {
    return defaultRelative;
  }
  throw new Error(
    "Visual vocabulary catalog not found. Set KARVE_VIDEO_TALKCRAFT_ROOT or ensure .agents/skills/video-talkcraft is installed."
  );
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const result: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

function inferRepresentationKinds(
  slug: string,
  category: string
): RepresentationKind[] {
  const kinds = new Set<RepresentationKind>();

  // 1. Transitions
  if (/transition|wipe|slam|pullback/.test(slug) || category === "转场结构") {
    kinds.add("transition");
  }

  // 2. Terminal & Code
  if (/terminal|terminal-typing/.test(slug)) {
    kinds.add("terminal");
    kinds.add("code");
  }
  if (/code|glass-code|claude-code/.test(slug)) {
    kinds.add("code");
  }

  // 3. Real UI / Workflow
  if (/ui-flow|ui-prop|cursor-actor|cursor-locked/.test(slug)) {
    kinds.add("real_ui");
  }

  // 4. Screenshot Annotation & Focus
  if (
    /callout|magnifier|focus-dim|highlighter|scribble|hand-drawn-ellipse|corner-bracket/.test(
      slug
    ) ||
    category === "强调标注"
  ) {
    kinds.add("screenshot_annotation");
    kinds.add("emphasis");
  }

  // 5. Data Chart & Metrics
  if (/bar-chart|line-chart|chart-grow/.test(slug)) {
    kinds.add("data_chart");
  }
  if (/metric|number-counter|number-slab/.test(slug)) {
    kinds.add("metric");
  }

  // 6. Architecture & Process Flow
  if (
    /converging-arrows|step-timeline|numbered-step-stack|orbit-drift|long-take-world/.test(
      slug
    )
  ) {
    kinds.add("architecture_diagram");
    kinds.add("process_flow");
    kinds.add("relationship_diagram");
  }
  if (/step-timeline|numbered-step-stack/.test(slug)) {
    kinds.add("timeline");
  }
  if (/info-term-card/.test(slug)) {
    kinds.add("concept_diagram");
  }

  // 7. Comparison
  if (/strike-and-replace|alt-block-lines/.test(slug)) {
    kinds.add("comparison");
  }

  // 8. Evidence
  if (/evidence-scroll|news-card-desk/.test(slug) || category === "素材呈现") {
    kinds.add("evidence_card");
  }

  // 9. Host Layout
  if (/host-shrink|pip-zoom|lower-third/.test(slug) || category === "人物互动") {
    kinds.add("host_layout");
  }

  // 10. Text Emphasis
  if (
    category === "字幕花字" ||
    /keyword-pop|count-badge|type-contrast|slab-punch|speed-slab|impact-open/.test(
      slug
    )
  ) {
    kinds.add("emphasis");
  }

  if (kinds.size === 0) {
    kinds.add("concept_diagram");
  }

  return Array.from(kinds);
}

function inferVisualJobs(
  slug: string,
  category: string,
  kinds: RepresentationKind[]
): P7VisualJob[] {
  const jobs = new Set<P7VisualJob>();

  if (kinds.includes("transition")) {
    jobs.add("transition");
  }
  if (kinds.includes("emphasis") || kinds.includes("screenshot_annotation")) {
    jobs.add("emphasize");
  }
  if (kinds.includes("host_layout") || /open|title|chapter/.test(slug)) {
    jobs.add("orient");
  }
  if (
    kinds.includes("architecture_diagram") ||
    kinds.includes("concept_diagram") ||
    kinds.includes("relationship_diagram") ||
    kinds.includes("process_flow")
  ) {
    jobs.add("explain");
  }
  if (kinds.includes("real_ui") || kinds.includes("terminal") || kinds.includes("code")) {
    jobs.add("demonstrate");
  }
  if (kinds.includes("comparison")) {
    jobs.add("compare");
  }
  if (kinds.includes("evidence_card") || kinds.includes("data_chart") || kinds.includes("metric")) {
    jobs.add("prove");
  }

  if (jobs.size === 0) {
    jobs.add("explain");
  }

  return Array.from(jobs);
}

export function discoverCatalog(customRoot?: string): VisualCatalog {
  const sourceRoot = resolveCatalogRoot(customRoot);
  const cardsDir = join(sourceRoot, "references", "cards");
  if (!existsSync(cardsDir)) {
    throw new Error(`Visual vocabulary cards directory not found at: ${cardsDir}`);
  }

  const files = readdirSync(cardsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  const cards: CatalogCard[] = [];
  const hasher = createHash("sha256");

  for (const file of files) {
    const fullPath = join(cardsDir, file);
    const stat = statSync(fullPath);
    hasher.update(`${file}:${stat.size};`);

    const content = readFileSync(fullPath, "utf8");
    const fm = parseFrontmatter(content);

    const slug = fm.name || basename(file, ".md");
    const title = fm["标题"] || fm.title || slug;
    const summary = fm["一句话"] || fm["适用"] || fm.summary || "";
    const category = fm["类别"] || fm.category || "通用";

    const componentPath = join(sourceRoot, "template", "cards", `${slug}.tsx`);
    const demoPath = join(sourceRoot, "demos", slug, "index.html");

    const representation_kinds = inferRepresentationKinds(slug, category);
    const visual_jobs = inferVisualJobs(slug, category, representation_kinds);

    const tags: string[] = [
      category,
      ...representation_kinds,
      ...slug.split("-")
    ].filter(Boolean);

    cards.push({
      slug,
      title,
      summary,
      category,
      visual_jobs,
      representation_kinds,
      tags,
      recipe_card_path: join(sourceRoot, "references", "cards", file),
      ...(existsSync(componentPath) ? { component_source_path: componentPath } : {}),
      ...(existsSync(demoPath) ? { demo_path: demoPath } : {})
    });
  }

  const fingerprint = hasher.digest("hex");

  return {
    discovered_at: new Date().toISOString(),
    catalog_source: sourceRoot,
    catalog_fingerprint: fingerprint,
    total_cards: cards.length,
    cards
  };
}

export function searchVisualVocabulary(
  catalog: VisualCatalog,
  query: SearchQuery
): SearchResult[] {
  const results: SearchResult[] = [];
  const limit = query.limit ?? 5;

  for (const card of catalog.cards) {
    let score = 0;
    const reasons: string[] = [];

    // Filter by representation kind if specified
    if (query.representation_kind) {
      if (card.representation_kinds.includes(query.representation_kind)) {
        score += 50;
        reasons.push(`matches representation_kind '${query.representation_kind}' (+50)`);
      } else {
        // Skip cards that do not match the requested representation kind
        continue;
      }
    }

    // Visual job match (intent alignment)
    if (query.visual_job && card.visual_jobs.includes(query.visual_job)) {
      score += 20;
      reasons.push(`matches visual_job '${query.visual_job}' (+20)`);
    }

    // Keyword in slug / title / summary
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      if (card.slug.toLowerCase().includes(kw)) {
        score += 15;
        reasons.push(`slug contains '${query.keyword}' (+15)`);
      } else if (card.title.toLowerCase().includes(kw) || card.summary.toLowerCase().includes(kw)) {
        score += 6;
        reasons.push(`title/summary contains '${query.keyword}' (+6)`);
      }
    }

    // Tags match
    if (query.tags && query.tags.length > 0) {
      for (const tag of query.tags) {
        if (card.tags.includes(tag.toLowerCase())) {
          score += 4;
          reasons.push(`matches tag '${tag}' (+4)`);
        }
      }
    }

    if (score > 0) {
      results.push({
        card,
        score,
        matched_reasons: reasons
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
