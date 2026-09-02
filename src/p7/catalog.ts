import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  source_root: string;
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
  category: string,
  content: string
): RepresentationKind[] {
  const kinds = new Set<RepresentationKind>();
  const text = `${slug} ${category} ${content}`.toLowerCase();

  // Data / Metrics / Charts
  if (/chart|bar-chart|line-chart|数据/.test(text)) {
    kinds.add("data_chart");
  }
  if (/metric|number|counter|sparkline|数字/.test(text)) {
    kinds.add("metric");
  }
  if (/timeline|step-stack|时间线|步骤/.test(text)) {
    kinds.add("timeline");
  }

  // Diagram / Architecture / Flow
  if (/converging-arrows|orbit|relation|架构|流程/.test(text)) {
    kinds.add("architecture_diagram");
    kinds.add("relationship_diagram");
    kinds.add("process_flow");
  }
  if (/concept|term|info-term|概念/.test(text)) {
    kinds.add("concept_diagram");
  }

  // Comparison
  if (/contrast|compare|versus|strike-and-replace|对比/.test(text)) {
    kinds.add("comparison");
  }

  // Code / Terminal / UI
  if (/terminal|command|bash|命令行/.test(text)) {
    kinds.add("terminal");
  }
  if (/code|glass-code|claude-code|代码/.test(text)) {
    kinds.add("code");
  }
  if (/ui-|cursor-|theater|界面|演示/.test(text)) {
    kinds.add("real_ui");
  }

  // Annotations & Evidence
  if (/callout|magnifier|focus-dim|highlighter|scribble|标注|圈出/.test(text)) {
    kinds.add("screenshot_annotation");
    kinds.add("emphasis");
  }
  if (/evidence|news-card|document|证据/.test(text)) {
    kinds.add("evidence_card");
  }

  // Host Layout
  if (/host-|pip-|lower-third|人物|画中画/.test(text)) {
    kinds.add("host_layout");
  }

  // Transitions
  if (/transition|wipe|slam|pullback|转场/.test(text)) {
    kinds.add("transition");
  }

  // Emphasis
  if (/highlight|emphasis|pop|badge|underline|强调|花字/.test(text)) {
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

export function discoverCatalog(
  skillRoot = ".agents/skills/video-talkcraft"
): VisualCatalog {
  const cardsDir = resolve(skillRoot, "references", "cards");
  if (!existsSync(cardsDir)) {
    throw new Error(`Visual vocabulary cards directory not found at: ${cardsDir}`);
  }

  const files = readdirSync(cardsDir).filter((file) => file.endsWith(".md"));
  const cards: CatalogCard[] = [];

  for (const file of files) {
    const fullPath = join(cardsDir, file);
    const content = readFileSync(fullPath, "utf8");
    const fm = parseFrontmatter(content);

    const slug = fm.name || basename(file, ".md");
    const title = fm["标题"] || fm.title || slug;
    const summary = fm["一句话"] || fm["适用"] || fm.summary || "";
    const category = fm["类别"] || fm.category || "通用";

    const componentPath = join(skillRoot, "template", "cards", `${slug}.tsx`);
    const demoPath = join(skillRoot, "demos", slug, "index.html");

    const representation_kinds = inferRepresentationKinds(slug, category, content);
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
      recipe_card_path: join(skillRoot, "references", "cards", file),
      ...(existsSync(resolve(componentPath)) ? { component_source_path: componentPath } : {}),
      ...(existsSync(resolve(demoPath)) ? { demo_path: demoPath } : {})
    });
  }

  return {
    discovered_at: new Date().toISOString(),
    source_root: skillRoot,
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

    if (
      query.representation_kind &&
      card.representation_kinds.includes(query.representation_kind)
    ) {
      score += 10;
      reasons.push(`matches representation_kind '${query.representation_kind}' (+10)`);
    }

    if (query.visual_job && card.visual_jobs.includes(query.visual_job)) {
      score += 5;
      reasons.push(`matches visual_job '${query.visual_job}' (+5)`);
    }

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      if (card.slug.toLowerCase().includes(kw)) {
        score += 8;
        reasons.push(`slug contains '${query.keyword}' (+8)`);
      } else if (card.title.toLowerCase().includes(kw) || card.summary.toLowerCase().includes(kw)) {
        score += 4;
        reasons.push(`title/summary contains '${query.keyword}' (+4)`);
      }
    }

    if (query.tags && query.tags.length > 0) {
      for (const tag of query.tags) {
        if (card.tags.includes(tag.toLowerCase())) {
          score += 3;
          reasons.push(`matches tag '${tag}' (+3)`);
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
