import type { Article } from "../types/article.js";

// Page eligibility is separate from broad topic tags and source-wide item_type
// defaults. Require a launch/availability claim about an AI model or product;
// the publisher's opening excerpt can corroborate a terse headline. Model names
// are not an allowlist, and mentions elsewhere in a long article are not evidence.
const LAUNCH = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing)|unveil(?:s|ed|ing)?|open[ -]sourcing|now available|available now|now open[ -]source|generally available|rolling out|expands[^.!?]{0,40}model availability)\b/i;
const AI_DESCRIPTION = /\b(?:models?|LLMs?|VLMs?|ASR|TTS|agents?|translat(?:e|ion)|(?:chat)?GPT(?:[-\w.]+)?|AI (?:[a-z-]+ )?(?:models?|assistants?|agents?|platform|product|tool|systems|applications|capabilities|inference)|(?:enterprise|physics|physical|generative|agentic) AI|agentic|proactive assistants?|autonomous agents?|coding assistants?|advanced reasoning|(?:sketch|text|image|video|speech|audio)[ -]to[ -](?:image|text|video|speech|audio)|computer[ -]use|connectors and (?:[a-z-]+ )?workflows|frontier intelligence)\b/i;
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
  // Tracking queries and fragments do not identify the announced artifact.
  let sourcePath = "";
  try {
    sourcePath = article.url ? new URL(article.url).pathname : "";
  } catch {
    // A malformed URL supplies no canonical identity evidence.
  }
  const headline = title.split(/\s+\|\s+/)[0]
    .replace(/\b(introducing|announcing|launching|unveiling)\s*:\s*/i, "$1 ");
  const subject = headline.split(/:|(?<!\d),|,(?!\d)|\s+-\s+/)[0];
  const introduced = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+/i.test(subject);
  const name = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+/i, "")
    .split(/\s+(?:and|is|are|now|on|for|with|in|by|using)\b/i)[0].replace(/[.!?]+$/, "");
  const namedVersion = /[a-z]/i.test(name) && !/^\d/.test(name) && NAMED_VERSION.test(name)
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
  // Judge the announced artifact's purpose, not incidental AI/model mentions.
  // Punctuation and multiple modifiers in a publisher definition are common.
  const nonProductPurpose = /\b(?:hosting|annual)\b[^.!?]*\b(?:event|devday)\b/i.test(lead)
    || /\b[\w]+-bench\b/i.test(headline)
    || /\b(?:system card|model spec|safety framework|jam session|cohort|scholars|inference chip|AI infrastructure)\b/i.test(headline)
    || /\b(?:evaluating|how well can)\b/i.test(headline.slice(subject.length))
    || /^(?:Introducing [^,]+,|.{3,80}? (?:is|are) (?:an?|the|our)|we[^.!?]{0,60}(?:announce|announcing))(?:(?!\b(?:models?|tools?|platform|service)\b)[^.!?]){0,100}\b(?:benchmark|office|event)\b/i.test(lead)
    || /\b(?:initiative|founder program|AI infrastructure)\b/i.test(lead.slice(0, 180));
  if (nonProductPurpose || VERSION_TAG.test(title) || prereleaseBuild || routineToolVersion
    || (repositoryTag && !introduced)
    || (UNRELATED_SUBJECT.test(title) && !definedModelSubject && !describedModelSubject)
    || NON_LAUNCH.test(title) || NON_PRODUCT_LAUNCH.test(subject)
    || /\b(?:before|after|prior to|ahead of|since|without|until) (?:the )?(?:release|launch)\b/i.test(headline)
    || NON_PRODUCT_DESCRIPTION.test(lead)) return false;
  const availableName = lead.match(/^(.{3,100}?)\s+(?:is|are)\s+(?:now (?:(?:stable and )?generally available|available|open[ -]source|rolling out)|rolling out|generally available|available now)/i)?.[1]
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
    || /\b(?:now available|available now|now open[ -]source|generally available)\b/i.test(headline));
  // Check the availability clause itself, too: an editorial prefix can precede
  // a model name ("Open intelligence: Example 3 is now open source").
  const availabilityName = headline.split(":").at(-1)?.trim().split(/\s+(?:is|are)\b/i)[0] || "";
  const nameWords = name.split(/\s+/).filter((word) => /^[A-Z][\w.-]{2,}$/.test(word));
  const sameSubject = name.length > 2 && (lead.toLowerCase().includes(name.toLowerCase())
    || (nameWords.length > 1 && nameWords.every((word) => lead.toLowerCase().includes(word.toLowerCase()))));
  // A scoped package is an identifiable software artifact; an explicit launch
  // for AI establishes product purpose without a provider/package allowlist.
  const scopedSoftware = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|releas(?:e|es|ed|ing))\s+@[\w.-]+\/[\w.-]+/i.test(headline)
    && /\bfor\b[^.!?]{0,40}\bAI\b/i.test(headline);
  if (headlineLaunch && (AI_DESCRIPTION.test(headline) || scopedSoftware || /\breranker(?:s| family)?\b/i.test(headline) || namedVersion
    || NAMED_VERSION.test(availabilityName)
    || (sameSubject && AI_DESCRIPTION.test(lead)))) return true;
  if (availability) return true;
  // Editorial headlines may describe the purpose rather than repeat the full
  // named launch. Corroborate multiple meaningful identity words from an
  // explicit opening announcement, plus an AI model/product capability.
  const openingArtifact = lead.match(/^(?:Today[, ]+|We(?:[’']re| are)? )?(?:introducing|announcing|launching|releasing) (?:the )?([A-Z][^,.!?]{2,90})/i)?.[1]
    .split(/\s+(?:with|is|are|our)\b/i)[0];
  const identity = openingArtifact?.split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 2 && !/^(?:the|for|and|new|our|model|models|tools|tool|from|with)$/i.test(word)) || [];
  const sharedIdentity = identity.filter((word) => headline.toLowerCase().includes(word.toLowerCase()));
  if (openingArtifact && /^[A-Z]/.test(openingArtifact) && sharedIdentity.length >= 2
    && (AI_DESCRIPTION.test(lead) || /\btools?\b/i.test(lead) && /\bconnectors?\b/i.test(lead))) return true;
  // A sparse public-preview caption must identify the same named artifact in
  // both headline and canonical URL; raw CLI prerelease builds were rejected
  // above. This is a substantive product preview, not a version-tag preview.
  const previewName = lead.match(/^([A-Z][\w -]{2,70}?) (?:is|are) now in public preview\b/)?.[1];
  const previewSlug = previewName?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const artifactSlug = sourcePath.replace(/\/$/, "").split("/").at(-1);
  if (previewName && headline.includes(previewName) && artifactSlug === previewSlug
    && /\/(?:news|blog|products?|platforms?)\//i.test(sourcePath)) return true;
  // A same-subject definition of a NEW tool/model establishes a substantive
  // product launch; a definition describing existing usage does not.
  if (sameSubject && /^.{3,80}? (?:is|are) (?:a |an |our |the )?new\b/i.test(lead)
    && AI_DESCRIPTION.test(`${headline} ${lead}`)
    && /\b(?:models?|tools?|platform|service|assistant|application)\b/i.test(`${headline} ${lead}`)) return true;
  // Sparse model-family captions identify a released artifact, unlike a bare
  // name or an article mentioning models. Corroborate that identity in the URL.
  const captionName = subject.toLowerCase().replace(/\s+(?:suite|family)$/i, "").replace(/[^a-z0-9]+/g, "-");
  if (!lead && /\b(?:paired encoders and decoders|reasoning models|language models|vision models)\b/i.test(headline.slice(subject.length))
    && /\b(?:SoTA|new|open|state-of-the-art)\b/i.test(headline.slice(subject.length))
    && sourcePath.replace(/\/$/, "").split("/").at(-1) === captionName) return true;

  if (namedVersion && headline !== subject && DESCRIPTIVE_LAUNCH.test(headline.slice(subject.length))) return true;
  if (namedVersion && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;

  // A preview update can name the model before announcing its updated version.
  // Bind that first-person release claim to the same full base name nearby;
  // an unrelated release or a historical usage mention is not corroboration.
  const baseName = name.replace(/\s+(?:preview|beta|alpha)$/i, "");
  const updateClaim = lead.match(/\bwe(?:[’']re| are)?(?: (?:decided to|(?:are )?(?:excited|pleased|ready) to))?\s+releas(?:e|ing) an? (?:updated|new) version\b/i);
  const baseIndex = lead.toLowerCase().indexOf(baseName.toLowerCase());
  if (namedVersion && !toolBuild && /\bpreview\b/i.test(subject) && updateClaim
    && baseIndex >= 0 && baseIndex < (updateClaim.index ?? 0)
    && (updateClaim.index ?? 0) - (baseIndex + baseName.length) <= 80) return true;

  // An unnumbered name needs a launch claim that names that same subject. This
  // tolerates short navigation prefixes without accepting incidental old-model
  // release mentions in customer stories or research articles.
  if (sameSubject && OPENING_LAUNCH.test(lead) && AI_DESCRIPTION.test(lead)) return true;
  const leadLaunch = lead.match(/\bwe(?:[’']re| are)?(?:\s+[a-z]+){0,5}\s+(?:introduc(?:e|ing)|announc(?:e|ing)|launch(?:ing)?|releas(?:e|ing)|open[ -]sourcing)\b/i);
  if (sameSubject && AI_DESCRIPTION.test(lead) && leadLaunch && (leadLaunch.index ?? 0) < 150
    && lead.slice((leadLaunch.index ?? 0) + leadLaunch[0].length).toLowerCase().includes(name.toLowerCase())) return true;
  if (sameSubject && AI_DESCRIPTION.test(lead) && lead.toLowerCase().startsWith(name.toLowerCase())
    && /\b(?:is|are) (?:now (?:(?:stable and )?generally available|available|open[ -]source|rolling out)|rolling out|generally available|available now)/i.test(lead)) return true;
  // Some publisher feeds truncate the excerpt; their canonical launch slug
  // supplies corroboration for a model/product description in the headline.
  const launchedName = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|releas(?:e|es|ed|ing)|open[ -]sourcing)\s+(?:the )?/i, "").replace(/[.!?]+$/, "");
  const namedProduct = /^[A-Z][\w.-]*(?:\s+(?:[A-Z][\w.-]*|for|of|the|and)){1,4}$/.test(launchedName);
  const nameSlug = launchedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const canonicalSlug = sourcePath.replace(/\/$/, "").split("/").at(-1)?.replace(/^(?:introducing|announcing|launching|meet)-/, "");
  const uninformativeLead = !lead || /\bis an AI safety and research company\b/i.test(lead);
  // When an official feed supplies no useful excerpt, corroborate a proper
  // named launch with the same artifact name in its canonical URL.
  const modelOrProductPath = /\/(?:[^/]*models[^/]*|products?|platforms?)\//i.test(sourcePath);
  const targetAudience = /\bfor [A-Z]/.test(launchedName);
  if (introduced && namedProduct && canonicalSlug === nameSlug
    && ((uninformativeLead && (modelOrProductPath || targetAudience))
      || (targetAudience && AI_DESCRIPTION.test(lead)))) return true;
  // Sparse open-model captions can put modality words before a numbered name.
  // Require an open-model claim and the same artifact identity in its URL.
  if (uninformativeLead && namedVersion && /\bopen(?:[ -](?:source|weights?))?\b.*\bmodels?\b/i.test(subject)
    && canonicalSlug && canonicalSlug.split("-").every((part) => name.toLowerCase().split(/\W+/).includes(part))) return true;
  const launchUrl = /\/(?:introducing|announcing|launching|meet)-/i.test(sourcePath);
  const identityWords = canonicalSlug?.split("-").filter((word) => !/^(?:a|an|the|for|and|with|of|ai)$/.test(word)) || [];
  const titleWords = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-");
  const canonicalIdentity = identityWords.length > 0 && identityWords.every((word) => titleWords.includes(word === "vuln" ? "vulnerability" : word));
  const newModelIdentity = /\bnew\b[^.!?]*\bmodel\b/i.test(headline)
    && Boolean(identityWords[0] && titleWords.includes(identityWords[0]));
  const existingUsage = /\b(?:already|existing deployments|used in|previously released)\b/i.test(lead);
  // A canonical announcement can corroborate an abbreviated artifact caption;
  // require the URL to identify this headline's subject, rather than accepting
  // an unrelated AI mention anywhere in an announcement excerpt.
  return Boolean(launchUrl && (canonicalIdentity || newModelIdentity) && !existingUsage
    && (AI_DESCRIPTION.test(headline) || AI_DESCRIPTION.test(lead)));
}

export function modelReleases(articles: Article[]): Article[] {
  return articles.filter(isModelRelease);
}
