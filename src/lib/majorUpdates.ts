import type { Article } from "../types/article.js";

export interface MajorUpdateClassification {
  significance: "major";
  reason: string;
}

const RELEASE_INTENT = /\b(announc(?:e|es|ed|ing|ement)|introduc(?:e|es|ed|ing)|launch(?:e|es|ed|ing)?|releas(?:e|es|ed|ing)|available now|now available|ships?|unveil(?:s|ed|ing)?)\b/i;
const NAMED_MODEL_VERSION = /\b(?:gpt|claude|gemini|llama|qwen|deepseek|glm|kimi|mistral|mixtral|minimax|command|jamba|grok|nova|phi|gemma|step)[-\s]?[a-z]?\d+(?:\.\d+){0,2}\b/i;
const MAJOR_SEMVER = /\bv(?:ersion\s*)?(?:[2-9]|[1-9]\d+)\.0(?:\.0)?\b/i;
const HARNESS_NAMES = /\b(hermes|openclaw|openhands|aider|cline|roo code|goose|continue|letta|codex cli|claude code|gemini cli|kimi cli)\b/i;

export function classifyMajorUpdate(article: Pick<Article, "title" | "summary" | "content">): MajorUpdateClassification | null {
  // Keep promotion conservative: both the named version and release language must
  // appear in the headline. Body copy can mention unrelated historical releases.
  const text = article.title;
  if (RELEASE_INTENT.test(text) && NAMED_MODEL_VERSION.test(text)) {
    return { significance: "major", reason: "Named model version announced or released" };
  }
  if (RELEASE_INTENT.test(text) && HARNESS_NAMES.test(text) && MAJOR_SEMVER.test(text)) {
    return { significance: "major", reason: "Major harness version released" };
  }
  return null;
}

export function majorUpdates(articles: Article[]): Array<{ article: Article; reason: string }> {
  return articles.flatMap((article) => {
    const classification = classifyMajorUpdate(article);
    return classification ? [{ article, reason: classification.reason }] : [];
  });
}
