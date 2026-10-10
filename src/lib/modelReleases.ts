import type { Article } from "../types/article.js";

// This is a page selection rule, not an ingestion type or a general news topic.
// Require a launch about an AI subject in the headline. Historical releases in
// body copy and source-wide item_type defaults cannot establish eligibility.
const AI_SUBJECT = /\b(?:gpt[-\s]?\d|o[134](?:[-\s]|\b)|claude|gemini|embeddinggemma|gemma|llama|qwen(?:[-\s]?\d+(?:\.\d+)*)?|deepseek|glm|kimi|mistral[-\s](?:large|medium|small|ocr|nemo|\d)|mixtral|(?:mini)?max[-\s](?:music|h\d|m\d)|codestral|voxtral|pixtral|magistral|devstral|command [ar]|jamba|grok|nova|phi[-\s]?\d|nemotron|falcon|olmo|embed\s*\d|chatgpt|codex|north|le chat|(?:physics|physical) AI|AI (?:[a-z-]+ )?(?:models?|assistants?|agents?|platform|product)|(?:language|embedding|reasoning|generative|multimodal|frontier|report-generation) models?)\b/i;
const LAUNCH = /\b(?:introducing|announcing|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|unveiling|open[ -]sourcing|now available|available now|now open[ -]source|generally available|rolling out)\b/i;
const NON_LAUNCH = /\b(?:how|why|using|building|build|guide|tutorial|fine[ -]tuning|evaluating|evaluation|benchmark|case study|reports?(?!-generation)|survey|leaderboard|dataset|follow-up|conference|partnership|partners|funding|investigation|policy|recap|proof of concept|academy|fellowship|scholarship|class of|program|training infrastructure|model co-design)\b/i;
const REPOSITORY_VERSION = /^(?!introducing\b|announcing\b|launching\b)(?:[\w@/.-]+\s+){0,3}(?:rust-)?v?\d+\.\d+(?:\.\d+)*(?:[-+][\w.-]+)?(?:\s+released)?$/i;
const PRERELEASE_TAG = /\d+\.\d+(?:\.\d+)*[-.](?:alpha|beta|rc|preview|nightly|canary)\b|\b(?:release-publish\/|desktop-nightly-)/i;
const MODEL_IDENTITY = /^(?:gpt[-\s]?\d|o[134]\b|(?:claude|gemini|embeddinggemma|gemma|llama|qwen|deepseek|glm|kimi|mistral|mixtral|minimax|command|jamba|grok|nova|phi|nemotron|olmo|embed|north)(?=[-\s\d])[^:|]{0,35}\d|falcon[-\s][a-z0-9]+)/i;
const NON_PRODUCT_DESCRIPTION = /\b(?:fellowship|scholarship|training program|student innovators|proof of concept)\b/i;
const AI_DESCRIPTION = /\b(?:(?:AI|agentic|generative AI) (?:platform|assistant|agent|product)|(?:language|embedding|reasoning|multimodal|report-generation) model|proactive assistants?)\b/i;

export function isModelRelease(article: Pick<Article, "title" | "summary" | "content">): boolean {
  const title = article.title.replace(/[\u2010-\u2015]/g, "-").trim();
  const lead = (article.summary || article.content || "").slice(0, 300).replace(/[\u2010-\u2015]/g, "-");
  if (REPOSITORY_VERSION.test(title) || PRERELEASE_TAG.test(title)
    || NON_LAUNCH.test(title) || NON_PRODUCT_DESCRIPTION.test(lead)) return false;

  // Launch wording plus an AI subject must be in the same headline clause, so
  // "Launching a game: powered by GPT-6" is not treated as a model announcement.
  const clauses = title.split(/[:|]/);
  if (clauses.some((clause) => {
    const launch = clause.match(LAUNCH);
    const subject = clause.match(AI_SUBJECT);
    if (!launch || !subject) return false;
    const between = (launch.index ?? 0) < (subject.index ?? 0)
      ? clause.slice((launch.index ?? 0) + launch[0].length, subject.index)
      : clause.slice((subject.index ?? 0) + subject[0].length, launch.index);
    const launchLeads = (launch.index ?? 0) < (subject.index ?? 0) && (launch.index ?? 0) < 35;
    const subjectPrefix = clause.slice(0, subject.index).trim();
    const subjectLeads = /^(?:(?:OpenAI|NVIDIA|Google|Anthropic|xAI)(?:['’]s)?)?$/i.test(subjectPrefix);
    return (launchLeads || subjectLeads) && !/\b(?:with|about|using|powered by)\b/i.test(between);
  })) return true;

  // Model-led descriptive announcements often omit a launch verb (e.g. Embed 5).
  // Only a leading AI subject can use a colon or a publisher's rollout statement.
  const leadingSubject = title.match(AI_SUBJECT);
  if (MODEL_IDENTITY.test(title) && title.includes(":")) return true;
  if (leadingSubject?.index === 0) {
    const subject = title.split(/\s+(?:and|is|are|for|with)\s+|[:|]/i)[0];
    if (lead.toLowerCase().startsWith(subject.toLowerCase()) && /\b(?:is|are) (?:now available|rolling out|generally available)\b/i.test(lead)) return true;
  }

  // New product names need no ever-growing name list, but the publisher must
  // describe that same introduced subject as an AI product in the opening text.
  const introduced = title.match(/^(?:Introducing|Announcing|Launching)\s+([^:|]+)(?:[:|]|$)/i)?.[1]?.trim();
  return Boolean(introduced && lead.toLowerCase().startsWith(introduced.toLowerCase()) && AI_DESCRIPTION.test(lead));
}

export function modelReleases(articles: Article[]): Article[] {
  return articles.filter(isModelRelease);
}
