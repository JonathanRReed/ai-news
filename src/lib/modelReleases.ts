import type { Article } from "../types/article.js";

// Page eligibility is separate from broad topic tags and source-wide item_type
// defaults. Require a launch/availability claim about an AI model or product;
// the publisher's opening excerpt can corroborate a terse headline. Model names
// are not an allowlist, and mentions elsewhere in a long article are not evidence.
const LAUNCH = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|unveil(?:s|ed|ing)?|open[ -]sourcing|now available|available now|now open[ -]source|generally available|rolling out|expands[^.!?]{0,40}model availability)\b/i;
const AI_DESCRIPTION = /\b(?:models?|LLMs?|VLMs?|ASR|TTS|agents?|translat(?:e|ion)|(?:chat)?GPT(?:[-\w.]+)?|AI (?:[a-z-]+ )?(?:models?|assistants?|agents?|platform|product|tool|systems|applications|capabilities|inference)|(?:enterprise|physics|physical|generative|agentic) AI|agentic|proactive assistants?|autonomous agents?|coding assistants?|connectors and (?:[a-z-]+ )?workflows|frontier intelligence)\b/i;
const NON_LAUNCH = /\b(?:evaluation|benchmarks?|case study|reports?(?!-generation)|survey|leaderboard|dataset|follow-up|conference|advisory (?:council|board)|institute|partnerships?|partners|funding|investigation|policy|recap|ICYMI|lessons|adoption|comparison|overview|roundup|research initiative|proof of concept|academy|fellowship|scholarship|class of|program|training infrastructure|model co-design)\b/i;
const INSTRUCTIONAL = /\b(?:how|why|using|building|build|serve|deploy|optimize|experiment|guide|tutorial|fine[ -]tuning|evaluating)\b/i;
const UNRELATED_SUBJECT = /\b(?:quantum|qiskit|geforce|games?|gaming|regional office|hardware|CPU|data centers?|GPU cluster|earnings|financial results|business model|pricing model|economic index)\b/i;
const NON_PRODUCT_DESCRIPTION = /\b(?:fellowship|scholarship|training program|student innovators|proof of concept|incubates experimental|new (?:division|office|organization)|(?:new|our|an?) (?:[a-z-]+ )?benchmark|evaluation framework)\b/i;
const VERSION_TAG = /^(?:stable\s+)?(?:release\s+)?(?:rust-)?v?\d+\.\d+(?:\.\d+)*(?:[-+][\w.-]+)?$/i;
const PRERELEASE_TAG = /\d+\.\d+(?:\.\d+)*[-.](?:alpha|beta|rc|preview|nightly|canary)\b|\b(?:release-publish\/|desktop-nightly-)/i;
const NAMED_VERSION = /^(?:[a-z][\w.-]*\s+){0,4}[a-z]*-?\d+(?:\.\d+)*(?:[\w.-]*)(?:\s+[\w.-]+){0,3}$/i;
const DESCRIPTIVE_LAUNCH = /\b(?:new|next[ -]generation|frontier|open|models?|LLMs?|VLMs?|ASR|TTS|agents?|translat(?:e|ion)|agentic|AI|reasoning|intelligence|safety)\b/i;
const OPENING_LAUNCH = /^(?:today[, ]+|we(?:[’']re| are)?\s+|we are pleased to\s+|we(?:[’']re| are) excited to\s+)?(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|upgrad(?:e|es|ed|ing)|rolling out)/i;

export function isModelRelease(article: Pick<Article, "title" | "summary" | "content"> & Partial<Pick<Article, "url">>): boolean {
  const title = article.title.replace(/[\u2010-\u2015]/g, "-").trim();
  const lead = (article.summary || article.content || "").slice(0, 300).replace(/[\u2010-\u2015]/g, "-");
  const headline = title.split(/\s+\|\s+|\s+-\s+/)[0];
  const subject = headline.split(/[:,]/)[0];
  const introduced = /\b(?:introducing|announcing|launching|unveiling)\s+/i.test(subject);
  const name = subject.replace(/^.*?\b(?:introducing|announcing|launching|unveiling)\s+/i, "")
    .split(/\s+(?:and|is|are|now|on|for|with)\b/i)[0];
  const namedVersion = NAMED_VERSION.test(name);
  const routineToolVersion = /\b(?:cli|sdk|desktop)\b/i.test(title) && !introduced
    && /\bv?\d+\.\d+(?:\.\d+)*(?:\s+released)?$/i.test(title);
  const repositoryTag = article.url?.includes("github.com/") && article.url.includes("/releases/tag/");
  if (VERSION_TAG.test(title) || PRERELEASE_TAG.test(title) || routineToolVersion
    || (repositoryTag && !introduced) || UNRELATED_SUBJECT.test(title)
    || NON_LAUNCH.test(title) || NON_PRODUCT_DESCRIPTION.test(lead)) return false;
  // Launch articles sometimes include a developer guide after the colon. A
  // tutorial or partnership as the subject still cannot become a release.
  if (INSTRUCTIONAL.test(subject) || (!introduced && INSTRUCTIONAL.test(headline))) return false;

  const launch = headline.match(LAUNCH);
  const headlineLaunch = launch && ((launch.index ?? 0) < 40
    || /\b(?:now available|now open[ -]source|generally available)\b/i.test(headline));
  // Check the availability clause itself, too: an editorial prefix can precede
  // a model name ("Open intelligence: Example 3 is now open source").
  const availabilityName = headline.split(":").at(-1)?.trim().split(/\s+(?:is|are)\b/i)[0] || "";
  if (headlineLaunch && (AI_DESCRIPTION.test(`${headline} ${lead}`)
    || namedVersion || NAMED_VERSION.test(availabilityName))) return true;

  if (namedVersion && headline !== subject && DESCRIPTIVE_LAUNCH.test(headline.slice(subject.length))) return true;
  if (namedVersion && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;

  // An unnumbered name needs a launch claim that names that same subject. This
  // tolerates short navigation prefixes without accepting incidental old-model
  // release mentions in customer stories or research articles.
  const sameSubject = name.length > 2 && lead.toLowerCase().includes(name.toLowerCase());
  if (sameSubject && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;
  const leadLaunch = lead.match(/\bwe(?:[’']re| are)?(?:\s+[a-z]+){0,5}\s+(?:introduc(?:e|ing)|announc(?:e|ing)|launch(?:ing)?|releas(?:e|ing)|open[ -]sourcing)\b/i);
  if (sameSubject && AI_DESCRIPTION.test(lead) && leadLaunch && (leadLaunch.index ?? 0) < 150
    && lead.slice((leadLaunch.index ?? 0) + leadLaunch[0].length).toLowerCase().includes(name.toLowerCase())) return true;
  if (sameSubject && AI_DESCRIPTION.test(lead) && lead.toLowerCase().startsWith(name.toLowerCase())
    && /\b(?:is|are) (?:now |rolling out|generally available)/i.test(lead)) return true;
  const availableSubject = lead.match(/^(.{3,100}?)\s+(?:is|are)\s+(?:now |rolling out|generally available)/i)?.[1]
    .split(/,|\s+(?:from|by)\s+/i)[0].trim();
  if (availableSubject && headline.toLowerCase().includes(availableSubject.toLowerCase())
    && AI_DESCRIPTION.test(lead)) return true;
  // Some publisher feeds truncate the excerpt; their canonical launch slug
  // supplies corroboration for a model/product description in the headline.
  const launchUrl = /\/(?:introducing|announcing|launching|meet)-/i.test(article.url || "");
  return launchUrl && AI_DESCRIPTION.test(`${headline} ${lead}`);
}

export function modelReleases(articles: Article[]): Article[] {
  return articles.filter(isModelRelease);
}
