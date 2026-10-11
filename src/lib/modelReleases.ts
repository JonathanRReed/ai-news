import type { Article } from "../types/article.js";

// Page eligibility is separate from broad topic tags and source-wide item_type
// defaults. Require a launch/availability claim about an AI model or product;
// the publisher's opening excerpt can corroborate a terse headline. Model names
// are not an allowlist, and mentions elsewhere in a long article are not evidence.
const LAUNCH = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|unveil(?:s|ed|ing)?|open[ -]sourcing|now available|available now|now open[ -]source|generally available|rolling out|expands[^.!?]{0,40}model availability)\b/i;
const AI_DESCRIPTION = /\b(?:models?|LLMs?|VLMs?|ASR|TTS|agents?|translat(?:e|ion)|(?:chat)?GPT(?:[-\w.]+)?|AI (?:[a-z-]+ )?(?:models?|assistants?|agents?|platform|product|tool|systems|applications|capabilities|inference)|(?:enterprise|physics|physical|generative|agentic) AI|agentic|proactive assistants?|autonomous agents?|coding assistants?|computer[ -]use|connectors and (?:[a-z-]+ )?workflows|frontier intelligence)\b/i;
const NON_LAUNCH = /\b(?:evaluation|benchmarks?|case study|reports?(?!-generation)|survey|leaderboard|dataset|follow-up|conference|advisory (?:council|board)|institute|mission|blueprint|partner network|partnerships?|partners|funding|investigation|policy|recap|ICYMI|lessons|adoption|comparison|overview|roundup|research initiative|proof of concept|academy|fellowship|scholarship|class of|program|training infrastructure|model co-design)\b/i;
const INSTRUCTIONAL = /\b(?:how|why|using|building|build|serve|deploy|optimize|experiment|guide|tutorial|fine[ -]tuning|evaluating|training|explained|explaining)\b/i;
const UNRELATED_SUBJECT = /\b(?:quantum|qiskit|geforce|games?|gaming|regional office|hardware|CPU|computers|data centers?|GPU cluster|earnings|financial results|business model|pricing model|economic index)\b/i;
const NON_PRODUCT_DESCRIPTION = /\b(?:fellowship|scholarship|training program|student innovators|proof of concept|incubates experimental|new (?:[a-z-]+ ){0,2}(?:blog|newsletter|podcast|series|course)|new (?:division|office|organization)|(?:new|our|an?) (?:[a-z-]+ )?benchmark|evaluation framework)\b/i;
const MODEL_DEFINITION = /^(.{3,80}?) (?:is|are) (?:an?|the) open[ -]source (?:(?:(?:vision|language|foundation|multimodal|audio|speech|image|reasoning|neural) ){1,3}models?|VLMs?|LLMs?)\b/i;
const NON_PRODUCT_LAUNCH = /\b(?:announc(?:e|es|ed|ing)|introduc(?:e|es|ed|ing)|launch(?:es|ed|ing)?)\s+(?:(?:a|an|the|new|strategic|global|major)\s+){0,4}(?:collaboration|alliance|agreement|partnership|partner network)\b/i;
const VERSION_TAG = /^(?:stable\s+)?(?:release\s+)?(?:rust-)?v?\d+\.\d+(?:\.\d+)*(?:[-+][\w.-]+)?$/i;
const PRERELEASE_TAG = /\d+\.\d+(?:\.\d+)*[-.](?:alpha|beta|rc|preview|nightly|canary)\b|\b(?:release-publish\/|desktop-nightly-)/i;
const NAMED_VERSION = /^(?:[a-z][\w.-]*\s+){0,4}[a-z]*-?\d+(?:\.\d+)*(?:[\w.-]*)(?:\s+[\w.-]+){0,3}$/i;
const DESCRIPTIVE_LAUNCH = /\b(?:new|next[ -]generation|frontier|open|models?|LLMs?|VLMs?|ASR|TTS|agents?|translat(?:e|ion)|agentic|AI|reasoning|intelligence|safety)\b/i;
const RETURN_LAUNCH = /\b(?:is back|returns?) with\b.*\bopen[ -](?:source|weights?)\b/i;
const OPENING_LAUNCH = /^(?:today[, ]+|we(?:[’']re| are)?\s+|we are pleased to\s+|we(?:[’']re| are) excited to\s+)?(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|upgrad(?:e|es|ed|ing)|rolling out)/i;

export function isModelRelease(article: Pick<Article, "title" | "summary" | "content"> & Partial<Pick<Article, "url">>): boolean {
  const title = article.title.replace(/[\u2010-\u2015]/g, "-").trim();
  const lead = (article.summary || article.content || "").slice(0, 300).replace(/[\u2010-\u2015]/g, "-");
  const headline = title.split(/\s+\|\s+/)[0]
    .replace(/\b(introducing|announcing|launching|unveiling)\s*:\s*/i, "$1 ");
  const subject = headline.split(/[:,]|\s+-\s+/)[0];
  const introduced = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+/i.test(subject);
  const name = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+/i, "")
    .split(/\s+(?:and|is|are|now|on|for|with|in|by|using)\b/i)[0].replace(/[.!?]+$/, "");
  const namedVersion = NAMED_VERSION.test(name)
    && !/^(?:with|from|for|on|using|our|the|a|an|before|after|how|why)\b/i.test(name);
  const definedName = lead.match(MODEL_DEFINITION)?.[1].split(/\s+/).slice(0, 2).join(" ");
  const definedModelSubject = Boolean(definedName && subject.toLowerCase().startsWith(definedName.toLowerCase()));
  const describedModelSubject = namedVersion
    && /\b(?:(?:AI|foundation|language|vision|audio|speech|image|multimodal|reasoning) models?|VLM|LLM)\b/i.test(headline);
  const routineToolVersion = /\b(?:cli|sdk|desktop)\b/i.test(title) && !introduced
    && /\bv?\d+\.\d+(?:\.\d+)*(?:\s+released)?$/i.test(title);
  const repositoryTag = article.url?.includes("github.com/") && article.url.includes("/releases/tag/");
  const toolBuild = repositoryTag || /\b(?:cli|sdk|desktop)\b/i.test(title);
  const prereleaseBuild = PRERELEASE_TAG.test(title) && (toolBuild || (!introduced && !describedModelSubject));
  if (VERSION_TAG.test(title) || prereleaseBuild || routineToolVersion
    || (repositoryTag && !introduced)
    || (UNRELATED_SUBJECT.test(title) && !definedModelSubject && !describedModelSubject)
    || NON_LAUNCH.test(title) || NON_PRODUCT_LAUNCH.test(subject)
    || /\b(?:before|after|prior to|ahead of|since|without|until) (?:the )?(?:release|launch)\b/i.test(headline)
    || NON_PRODUCT_DESCRIPTION.test(lead)) return false;
  const availableName = lead.match(/^(.{3,100}?)\s+(?:is|are)\s+(?:now (?:(?:stable and )?generally available|available|open[ -]source|rolling out)|rolling out|generally available)/i)?.[1]
    .split(/,|\s+(?:from|by)\s+/i)[0].trim();
  const availableVersion = availableName?.match(/\d+(?:\.\d+)*/g)?.at(-1);
  const sharedName = availableName?.split(/\s+/).some((word) => /^[A-Z][a-zA-Z-]{2,}/.test(word)
    && !/^(?:Our|The|New|Model|AI|Embed|Language|Open|Source)$/.test(word)
    && headline.toLowerCase().includes(word.toLowerCase()));
  // Feeds can include a provider or variant name omitted from the headline.
  // An abbreviated availability claim must still share a name and version.
  const availability = Boolean(availableName && AI_DESCRIPTION.test(lead)
    && (headline.toLowerCase().includes(availableName.toLowerCase())
      || (availableVersion && headline.includes(availableVersion) && sharedName)));
  // Launch articles sometimes include a developer guide after the colon. A
  // tutorial or partnership as the subject still cannot become a release.
  if (!availability && (INSTRUCTIONAL.test(subject) || (!introduced && INSTRUCTIONAL.test(headline)))) return false;

  // A definition identifies the model; it does not establish a release. For a
  // truncated publisher excerpt, require an explicit new/enhanced capability
  // announcement, and reject definitions describing existing deployments.
  const newCapability = /\b(?:enables?|brings?|advances?)\b[^.!?]*\b(?:new|enhanced|next[ -]generation)\b/i.test(headline);
  if (definedModelSubject && newCapability
    && !/\b(?:already|existing|used in|previously released)\b/i.test(lead)) return true;
  // A publisher can announce an unnumbered open model with a return headline
  // and no excerpt. Require both that launch claim and an AI description.
  if (RETURN_LAUNCH.test(headline) && AI_DESCRIPTION.test(headline)) return true;
  const launch = headline.match(LAUNCH);
  const headlineLaunch = launch && ((launch.index ?? 0) < 40
    || /\b(?:now available|now open[ -]source|generally available)\b/i.test(headline));
  // Check the availability clause itself, too: an editorial prefix can precede
  // a model name ("Open intelligence: Example 3 is now open source").
  const availabilityName = headline.split(":").at(-1)?.trim().split(/\s+(?:is|are)\b/i)[0] || "";
  const nameWords = name.split(/\s+/).filter((word) => /^[A-Z][\w.-]{2,}$/.test(word));
  const sameSubject = name.length > 2 && (lead.toLowerCase().includes(name.toLowerCase())
    || (nameWords.length > 1 && nameWords.every((word) => lead.toLowerCase().includes(word.toLowerCase()))));
  if (headlineLaunch && (AI_DESCRIPTION.test(headline) || namedVersion
    || NAMED_VERSION.test(availabilityName)
    || (sameSubject && AI_DESCRIPTION.test(lead)))) return true;
  if (availability) return true;

  if (namedVersion && headline !== subject && DESCRIPTIVE_LAUNCH.test(headline.slice(subject.length))) return true;
  if (namedVersion && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;

  // An unnumbered name needs a launch claim that names that same subject. This
  // tolerates short navigation prefixes without accepting incidental old-model
  // release mentions in customer stories or research articles.
  if (sameSubject && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;
  const leadLaunch = lead.match(/\bwe(?:[’']re| are)?(?:\s+[a-z]+){0,5}\s+(?:introduc(?:e|ing)|announc(?:e|ing)|launch(?:ing)?|releas(?:e|ing)|open[ -]sourcing)\b/i);
  if (sameSubject && AI_DESCRIPTION.test(lead) && leadLaunch && (leadLaunch.index ?? 0) < 150
    && lead.slice((leadLaunch.index ?? 0) + leadLaunch[0].length).toLowerCase().includes(name.toLowerCase())) return true;
  if (sameSubject && AI_DESCRIPTION.test(lead) && lead.toLowerCase().startsWith(name.toLowerCase())
    && /\b(?:is|are) (?:now (?:(?:stable and )?generally available|available|open[ -]source|rolling out)|rolling out|generally available)/i.test(lead)) return true;
  // Some publisher feeds truncate the excerpt; their canonical launch slug
  // supplies corroboration for a model/product description in the headline.
  const launchedName = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+(?:the )?/i, "").replace(/[.!?]+$/, "");
  const namedProduct = /^[A-Z][\w.-]*(?:\s+(?:[A-Z][\w.-]*|for|of|the|and)){1,4}$/.test(launchedName);
  const nameSlug = launchedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const canonicalSlug = article.url?.replace(/\/$/, "").split("/").at(-1)?.replace(/^(?:introducing|announcing|launching|meet)-/, "");
  const uninformativeLead = !lead || /\bis an AI safety and research company\b/i.test(lead);
  // When an official feed supplies no useful excerpt, corroborate a proper
  // named launch with the same artifact name in its canonical URL.
  const modelOrProductPath = /\/(?:[^/]*models[^/]*|products?|platforms?)\//i.test(article.url || "");
  const targetAudience = /\bfor [A-Z]/.test(launchedName);
  if (introduced && namedProduct && canonicalSlug === nameSlug
    && ((uninformativeLead && (modelOrProductPath || targetAudience))
      || (targetAudience && AI_DESCRIPTION.test(lead)))) return true;
  // Sparse open-model captions can put modality words before a numbered name.
  // Require an open-model claim and the same artifact identity in its URL.
  if (uninformativeLead && namedVersion && /\bopen(?:[ -](?:source|weights?))?\b.*\bmodels?\b/i.test(subject)
    && canonicalSlug && canonicalSlug.split("-").every((part) => name.toLowerCase().split(/\W+/).includes(part))) return true;
  const launchUrl = /\/(?:introducing|announcing|launching|meet)-/i.test(article.url || "");
  return launchUrl && AI_DESCRIPTION.test(`${headline} ${lead}`);
}

export function modelReleases(articles: Article[]): Article[] {
  return articles.filter(isModelRelease);
}
