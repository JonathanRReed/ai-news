import { isModelRelease } from "./modelReleases.js";
import type { Article } from "../types/article.js";

export interface MajorUpdateClassification {
  significance: "major";
  reason: string;
}

const RELEASE_INTENT = /\b(announc(?:e|es|ed|ing|ement)|introduc(?:e|es|ed|ing)|launch(?:e|es|ed|ing)?|releas(?:e|es|ed|ing)|available now|now available|ships?|unveil(?:s|ed|ing)?)\b/i;
// Claude versions carry a tier word between the family and the number ("Claude Opus 4.5"),
// so the family alone followed by a digit would miss every Anthropic launch.
const MODEL_FAMILY = "gpt|claude(?:[-\\s](?:opus|sonnet|haiku|fable|mythos|instant))?|gemini|llama|qwen|deepseek|glm|kimi|mistral|mixtral|minimax|command|jamba|grok|nova|phi|gemma|step";
const NAMED_MODEL_VERSION = new RegExp(`\\b(?:${MODEL_FAMILY})[-\\s]?[a-z]?\\d+(?:\\.\\d+){0,2}\\b`, "i");
// A headline that only uses the model as a tool ("ships features with GPT-6 Astra") is a
// customer story, not a release, even though it contains release language.
const MODEL_AS_INSTRUMENT = new RegExp(`\\b(?:with|using|powered by|built (?:with|on)|thanks to)\\s+(?:the\\s+|[a-z]+[’']s\\s+)?(?:${MODEL_FAMILY})[-\\s]?[a-z]?\\d`, "i");
const LEADS_WITH_RELEASE = /^(?:introduc|announc|launch|releas|unveil|meet\b)/i;

// Which tracked publisher makes each family. When someone else publishes the headline (a cloud
// adding the model, a partner describing it), the reason says so instead of crediting a launch.
const FAMILY_MAKER: Array<[RegExp, string]> = [
  [/\bgpt\b|\bgpt[-\d]/i, "OpenAI"],
  [/\bclaude\b/i, "Anthropic"],
  [/\b(?:gemini|gemma)\b|\bgemma\d/i, "Google DeepMind"],
  [/\bllama\b/i, "Meta AI"],
  [/\bqwen/i, "Alibaba Qwen"],
  [/\bdeepseek\b/i, "DeepSeek"],
  [/\bglm\b|\bglm[-\d]/i, "Z.AI"],
  [/\bkimi\b/i, "Moonshot AI"],
  [/\b(?:mistral|mixtral)\b/i, "Mistral AI"],
  [/\bminimax\b/i, "MiniMax"],
  [/\bjamba/i, "AI21 Labs"],
  [/\bgrok\b/i, "xAI"],
  [/\bnova\b/i, "Amazon AI"],
];

export const OTHER_MAKER_REASON = "Named model version from another maker";

/** True when the model version named in the headline is made by a different tracked publisher. */
export function namesAnotherMakersModel(title: string, company?: string): boolean {
  if (!company) return false;
  // Judge the version that matched, not any family word elsewhere in the headline
  // ("Grok 4.6 on Gemini Enterprise Agent Platform" is about Grok).
  const version = title.match(NAMED_MODEL_VERSION)?.[0];
  if (!version) return false;
  const maker = FAMILY_MAKER.find(([family]) => family.test(version))?.[1];
  return Boolean(maker && maker !== company);
}
const MAJOR_SEMVER = /\bv(?:ersion\s*)?(?:[2-9]|[1-9]\d+)\.0(?:\.0)?\b/i;
const HARNESS_NAMES = /\b(hermes|openclaw|openhands|aider|cline|roo code|goose|continue|letta|codex cli|claude code|gemini cli|kimi cli)\b/i;

export function classifyMajorUpdate(article: Pick<Article, "title" | "summary" | "content"> & Partial<Pick<Article, "url" | "published_at" | "company">>): MajorUpdateClassification | null {
  // The model version must be in the headline. The shared launch classifier
  // can corroborate a terse headline without promoting unrelated body mentions.
  const text = article.title;
  const elsewhere = namesAnotherMakersModel(text, article.company);
  const instrumentOnly = MODEL_AS_INSTRUMENT.test(text) && !LEADS_WITH_RELEASE.test(text);
  if (RELEASE_INTENT.test(text) && NAMED_MODEL_VERSION.test(text) && !instrumentOnly) {
    return { significance: "major", reason: elsewhere ? OTHER_MAKER_REASON : "Named model version announced or released" };
  }
  if (NAMED_MODEL_VERSION.test(text) && isModelRelease(article)) {
    return { significance: "major", reason: elsewhere ? OTHER_MAKER_REASON : "Named model version with corroborated launch evidence" };
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
