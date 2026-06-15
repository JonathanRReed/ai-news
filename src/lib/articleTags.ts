import type { Article } from "../types/article.js";

// Topic facets are data-derived: each was confirmed to have >60 members in the
// current corpus (Releases 114, Agents 101, Infra 100, Multimodal 95, Tooling 68,
// Research 64). We deliberately omit "models/reasoning" (matched ~45% of items, too
// broad to filter on — the entity tags cover "which model") and funding/policy (too
// few members) so a chip never returns an empty feed.
export interface TopicFacet {
  key: string;
  label: string;
  re: RegExp;
}

export const TOPICS: TopicFacet[] = [
  { key: "releases", label: "Releases", re: /\b(launch(?:e|es|ed|ing)?|releas(?:e|es|ed|ing)|announc(?:e|es|ed|ing|ement|ements)?|introduc(?:e|es|ed|ing|tion|tions)?|now available|generally available|unveil(?:s|ed|ing)?|debut(?:s|ed|ing)?|rolling out)\b/i },
  { key: "agents", label: "Agents", re: /\b(agents?|agentic|tool[ -]use|mcp|orchestrat(?:e|es|ed|ing|ion)?|workflow automation)\b/i },
  { key: "infra", label: "Infra & hardware", re: /\b(gpu|chip|hardware|infrastructure|data ?center|cluster|inference|training|compute|kernel|cuda|accelerat|blackwell|nvlink|throughput|latency)\b/i },
  { key: "multimodal", label: "Multimodal", re: /\b(voice|audio|speech|image|video|vision|diffusion|text-to-|multimodal|render)\b/i },
  { key: "tooling", label: "Tooling", re: /\b(api|sdk|developer|library|framework|cli|open[ -]?source|open[ -]?weight|integration|plugin|toolkit)\b/i },
  { key: "research", label: "Research", re: /\b(research|paper|study|benchmark|evaluation|eval|findings|alignment|interpretab|safety)\b/i },
];

const ENTITY_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "GPT", re: /\bgpt[- ]?\d|\bgpt\b|\bo[134]\b/i },
  { label: "Claude", re: /\bclaude\b/i },
  { label: "Gemini", re: /\bgemini\b/i },
  { label: "Llama", re: /\bllama\b/i },
  { label: "Qwen", re: /\bqwen\b/i },
  { label: "DeepSeek", re: /\bdeepseek\b/i },
  { label: "Mistral", re: /\b(mistral|mixtral)\b/i },
  { label: "Grok", re: /\bgrok\b/i },
  { label: "Nova", re: /\bnova\b/i },
];

function haystack(article: Pick<Article, "title" | "summary" | "content">): string {
  return `${article.title} ${article.summary ?? ""} ${article.content ?? ""}`;
}

export function deriveTopics(article: Pick<Article, "title" | "summary" | "content">): string[] {
  const text = haystack(article);
  return TOPICS.filter((topic) => topic.re.test(text)).map((topic) => topic.key);
}

export function topicLabel(key: string): string {
  return TOPICS.find((topic) => topic.key === key)?.label ?? key;
}

export function deriveEntities(article: Pick<Article, "title" | "summary" | "content">): string[] {
  const text = haystack(article);
  return ENTITY_PATTERNS.filter((entity) => entity.re.test(text)).map((entity) => entity.label);
}

export function readingMinutes(article: Pick<Article, "content" | "summary">): number {
  const words = (article.content || article.summary || "").trim().split(/\s+/).filter(Boolean).length;
  if (words < 40) return 0;
  return Math.max(1, Math.round(words / 200));
}

// A transparent importance score for choosing the lead / top stories. No opacity tricks:
// recency-weighted, with small, explainable boosts. Returns a number (higher = more prominent).
const PROVIDER_WEIGHT: Record<string, number> = {
  OpenAI: 3,
  "Google DeepMind": 3,
  "NVIDIA AI": 2,
  "Hugging Face": 2,
  "Alibaba Qwen": 2,
  DeepSeek: 2,
  "Amazon AI": 1,
  "IBM Research": 1,
};

export function importanceScore(article: Article, nowMs: number): number {
  const published = new Date(article.published_at).getTime();
  const ageDays = Number.isFinite(published) ? Math.max(0, (nowMs - published) / 86400000) : 999;
  const recency = Math.max(0, 14 - ageDays); // up to ~2 weeks of recency runway
  const provider = PROVIDER_WEIGHT[article.company] ?? 1;
  const hasSummary = article.summary && article.summary.trim().length > 80 ? 2 : 0;
  const topics = deriveTopics(article);
  const releaseBoost = topics.includes("releases") ? 2 : 0;
  return recency + provider + hasSummary + releaseBoost;
}
