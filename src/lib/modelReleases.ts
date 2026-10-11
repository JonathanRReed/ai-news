import type { Article } from "../types/article.js";

// Page eligibility is separate from broad topic tags and source-wide item_type
// defaults. Require a launch/availability claim about an AI model or product;
// the publisher's opening excerpt can corroborate a terse headline. Model names
// are not an allowlist, and mentions elsewhere in a long article are not evidence.
const LAUNCH = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|(?:releas(?:e|es|ed|ing)|^preview(?:s|ed|ing)?(?=\s+(?!of\b)))|unveil(?:s|ed|ing)?|open[ -]sourcing|^(?:today[, ]+)?meet(?=\s)|now available|available now|now open[ -]source|generally available|rolling out|now in (?:public|research) preview|expands[^.!?]{0,40}model availability)\b/i;
const COMPUTATIONAL_DESCRIPTION = /\b(?:(?:foundation|language|vision|visual|audio|speech|image|video|multimodal|reasoning|neural|embedding|generative|decision)(?:[ -][a-z-]+){0,2} models?|LLMs?|VLMs?|ASR|TTS|translat(?:e|ion)|(?:chat)?GPT(?:[-\w.]+)?|AI (?:[a-z-]+ ){0,3}(?:models?|assistants?|copilots?|agents?|platform|product|tool|systems|applications|capabilities|inference)|(?:enterprise|physics|physical|generative|agentic) AI|agentic|proactive assistants?|autonomous agents?|coding assistants?|advanced reasoning|(?:sketch|text|image|video|speech|audio)[ -]to[ -](?:image|text|video|speech|audio)|computer[ -]use|connectors and (?:[a-z-]+ )?workflows|frontier intelligence|multimodal (?:[a-z-]+ )?classifier)\b/i;
const AI_DESCRIPTION = new RegExp(`${COMPUTATIONAL_DESCRIPTION.source}|\\bagents?\\b`, "i");
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
const OPENING_LAUNCH = /^(?:today[, ]+|we(?:[’'](?:re|ve)| (?:are|have))?\s+|we are pleased to\s+|we(?:[’']re| are) excited to\s+)?(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?(?=\s+(?!of\b)))|upgrad(?:e|es|ed|ing)|rolling out)|^(?:today[, ]+)?meet(?=\s)/i;

const ARTIFACT_ROLE = /\b(?:models?|tools?|assistants?|copilots?|agents?|platforms?|products?|services?|applications?|APIs?|packages?|frameworks?|runtimes?|capabilit(?:y|ies)|librar(?:y|ies)|engines?|software|settings?|configuration|operating systems?)\b/i;
const ROLE_MODIFIERS = "(?:(?:a|an|the|our|this|its|new|updated|upgraded|open[ -]source)\\s+)*";
const GENERIC_ROLE = new RegExp(`^${ROLE_MODIFIERS}(?:${ARTIFACT_ROLE.source}|releases?)[.!?]?$`, "i");
const NON_COMPUTATIONAL_MODEL = /\b(?:business|operating|subscription|delivery|pricing) models?\b/i;
const NON_AFFIRMATIVE = /\b(?:not|never|no longer|may|might|could|would|should|will|possibly|possible|potential|possibility|perhaps|consider(?:s|ed|ing)?|(?:(?:declin|refus)(?:e[ds]?|ing)|fail(?:s|ed|ing)?) to|(?:delay(?:s|ed|ing)?|postpon(?:e[ds]?|ing)|cancel(?:s|l?ed|l?ing)?)|yet to|expected to|plans? to|planning to|hopes? to|rumou?rs?|whether|if|(?:isn|aren|don|doesn|won|haven|hasn|wasn|weren|couldn|wouldn|shouldn)[’']t|can(?:not|[’']t))\b/i;
const AVAILABLE = /^(?:(?:now )?(?:[a-z-]+ and )?generally available|now (?:available|open[ -]source|rolling out|in (?:public|research) preview)|available now|rolling out)\b/i;

function evidenceClauses(text: string): string[] {
  // Preserve versions and coordinated product lists. Split "and" only when
  // both sides have independent predicates, rather than a shared model role.
  return text.split(/(?<!\bvs)[.!?]\s+|;\s*|\s+\b(?:but|however|whereas|while)\b\s+/i).flatMap((part) => {
    // A punctuated contextual adjunct is outside the following proposition.
    // Uncertainty within that proposition still invalidates its launch claim.
    const sentence = part.replace(/^(?:after|following|despite|based on|in response to)\b[^,]{1,120},\s*/i, "");
    const clauses: string[] = [];
    let start = 0;
    for (const conjunction of sentence.matchAll(/,?\s+and\s+/gi)) {
      const index = conjunction.index!;
      const left = sentence.slice(start, index);
      const right = sentence.slice(index + conjunction[0].length);
      if (/\b(?:is|are|was|were|will|would|may|might|can|could|do|does)\b/i.test(left)
        && /^.{1,100}?\s+(?:is|are|introduces?|launches?|releases?)\s+/i.test(right)) {
        clauses.push(left.trim());
        start = index + conjunction[0].length;
      }
    }
    clauses.push(sentence.slice(start).trim());
    return clauses;
  });
}

function availabilityCaption(clause: string): { name: string; role: string | null } | null {
  const caption = clause.match(/^([^:]+):\s*(.+)$/);
  if (!caption || !AVAILABLE.test(caption[1]) || NON_AFFIRMATIVE.test(caption[1])) return null;
  const appositive = caption[2].match(/^(.+?),\s+(?:an?|our|the)\s+(.+)$/i);
  return { name: (appositive?.[1] || caption[2]).trim(), role: appositive?.[2] || null };
}

function declaredRole(clause: string): string | null {
  const caption = clause.match(/^[^:]{3,80}:\s+(?:an?|our|the) (.+)/i)?.[1];
  return clause.match(/^.{3,80}? (?:is|are) (?:an?|our|the) (.+)/i)?.[1]
    || (caption && ARTIFACT_ROLE.test(caption.split(/\s+(?:for|of|about|from|using)\s+/i)[0]) ? caption : null)
    || clause.match(/^(?:our|the|an?) ([^,]+),\s*[A-Z][\w .-]+,\s*(?:is|are)\b/i)?.[1]
    || clause.match(/\bavailable(?: now)?\s+as\s+(?:(?:an?|our|the)\s+)?(.+)/i)?.[1]
    || clause.match(/\b(?:available(?: now)?|preview),\s+(?:an?|our|the) (.+)/i)?.[1]
    || availabilityCaption(clause)?.role
    || clause.match(/\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?))\s+[^,]+,\s+(?:an?|our|the|its)\s+(.+)/i)?.[1]
    || null;
}

function refersToArtifact(clause: string): boolean {
  const subject = clause.match(/^(it|(?:this|these) [\w -]+?)\s+(?:is|are|[a-z-]+s)\b/i)?.[1];
  return subject?.toLowerCase() === "it"
    || Boolean(subject && /\b(?:models?|agents?|assistants?|copilots?|products?|tools?|services?|updates?)$/i.test(subject))
    || /^(?:building on|built (?:on|upon)|based on|we(?:[’'](?:re|ve)| (?:are|have))? releasing the (?:model|code))\b/i.test(clause);
}

function hasAIPurpose(clause: string): boolean {
  const description = clause.replace(/[“”"‘’]/g, "");
  return AI_DESCRIPTION.test(description)
    || (/\bmodels?\b/i.test(description) && !NON_COMPUTATIONAL_MODEL.test(description));
}

function continuationPurpose(...clauses: string[]): boolean {
  for (const clause of clauses) {
    const userOutcome = /^(?:projects|users|developers|customers) that (?:join|use|adopt)\b/i.test(clause);
    if (!refersToArtifact(clause) && !userOutcome) return false;
    // Passive adoption by an AI-working audience is not an artifact function.
    const purpose = clause.replace(/\b(?:used|adopted|chosen) by\b.*$/i, "")
      .replace(/\s+for\s+(?:teams?|users?|developers?|customers?|researchers?|people)\b(?!\s+to\b).*$/i, "");
    const signal = purpose.match(AI_DESCRIPTION) || purpose.match(/\bmodels?\b/i);
    let predicate = purpose.slice(0, signal?.index).replace(/^(?:it|(?:this|these) [\w -]+?)\s+/i, "");
    // A released service can promise what joining users will receive; that
    // user-outcome future does not speculate about the artifact's AI function.
    if (userOutcome) predicate = predicate.replace(/\bwill\b/i, "");
    if (signal && hasAIPurpose(purpose) && !NON_AFFIRMATIVE.test(predicate)) return true;
  }
  return false;
}

function uninformativeRole(declaration: string): boolean {
  // A generic artifact plus a bare human audience has not yet stated purpose.
  // Any informative noun phrase or functional complement must stand on its own.
  const role = declaration.replace(/\s+for\s+(?:(?:our|your|the|their)\s+)?(?:teams?|users?|developers?|customers?|researchers?|people|companies|businesses|organizations?)[.!?]?$/i, "").trim();
  // Degree adjectives about a generic release express quality, not a
  // functional role. An expense tracker remains an informative role.
  const qualitative = role.replace(/^(?:most|least|more|less) [a-z-]+\s+/i, "")
    .replace(/\s+(?:yet|to date|so far)[.!?]?$/i, "");
  // An operating system states a non-AI role even with quality modifiers.
  return !/\boperating systems?\b/i.test(role)
    && (GENERIC_ROLE.test(role) || GENERIC_ROLE.test(qualitative));
}

function modelNoun(role: string): boolean {
  // A model in a benchmark's object is not the announced artifact's noun.
  const core = role.split(/\s+(?:of|for|about|from|using)\s+/i)[0];
  return /\b(?:models?|LLMs?|VLMs?)\b(?=\s*(?:$|[,.:;!?'’"]|\b(?:is|are|and|on|in|with|that|which|to|now|by|built|yet|famil(?:y|ies)|series|[a-z-]+(?:ed|ing))\b))/i.test(core)
    && !NON_COMPUTATIONAL_MODEL.test(core);
}

function announcedPurpose(clause: string): boolean {
  // Definitions and appositives describe the artifact's role. A model mention
  // in a name or target audience cannot override a declared non-AI role.
  const declaration = declaredRole(clause);
  // Availability/motion predicates identify the offered artifact separately
  // from its destination platform. A platform name is not an add-on's role.
  const available = availabilitySubject(clause);
  const launch = affirmativeLaunch(clause);
  const launchedObject = launch && /\bmeet$/i.test(launch[0]) ? clause.slice((launch.index || 0) + launch[0].length)
    .split(/\s+(?:in|on|at|to)\s+/i)[0] : null;
  const offeredSubject = available
    ? availabilityCaption(clause)?.name || clause.split(/\s+(?:is|are)\s+/i)[0]
    : launchedObject || clause.split(/\s+(?:comes?|(?:is|are) coming) to\b/i)[0];
  // A modality-conversion complement describes the artifact's function,
  // unlike a platform destination or an audience that happens to use AI.
  const availableFunction = available && clause.match(/\bavailable(?: now)?\s+for\s+(.+)/i)?.[1];
  if (availableFunction && /^(?:speech|audio|text|image|video)[ -]to[ -](?:speech|audio|text|image|video)\b/i.test(availableFunction)) return true;
  // Here "model" must be the noun, not a modifier in "model downloads".
  // Prepositional target audiences are not the announced artifact's role.
  const artifactRole = (declaration || offeredSubject).split(/\s+(?:for|about|from|using)\s+/i)[0];
  if (/\bfamily of models\b/i.test(artifactRole)
    || (/\b(?:family|reproduction|version|generation|collection) of\b/i.test(artifactRole) && hasAIPurpose(artifactRole))) return true;
  const role = artifactRole.split(/\s+of\s+/i)[0];
  const purpose = (declaration || "").replace(/\s+for\s+(?:(?:our|your|the|their)\s+)?(?:teams?|users?|developers?|customers?|researchers?|people|companies|businesses|organizations?)\b(?!\s+to\b).*$/i, "");
  // A qualified agent role needs computational purpose. The generic label
  // alone cannot turn an informative human or material role into software.
  const agentRole = /^agents?$/i.test(role.match(ARTIFACT_ROLE)?.[0] || "");
  const computationalSignal = purpose.match(COMPUTATIONAL_DESCRIPTION)
    || purpose.match(/\b(?:AI|coding|software|computer[ -]use|machine[ -]learning|ML[ -]agents?)\b/i);
  const computationalAgent = Boolean(computationalSignal
    && !NON_AFFIRMATIVE.test(purpose.slice(0, computationalSignal.index)));
  if (declaration && agentRole && !uninformativeRole(role) && !computationalAgent) return false;
  if (modelNoun(role) || AI_DESCRIPTION.test(role.replace(/[“”"‘’]/g, ""))) return true;
  if (!declaration) return AI_DESCRIPTION.test(offeredSubject);
  const softwareRole = /\b(?:models?|tools?|services?|assistants?|copilots?|agents?|platforms?|applications?|APIs?|versions?|packages?|frameworks?|runtimes?|capabilit(?:y|ies)|librar(?:y|ies)|engines?)\b/i.test(role)
    || /^collection of visualizations\b/i.test(declaration);
  const announcingObject = clause.slice(0, clause.indexOf(declaration));
  // A human audience's AI work is not the software's purpose. Direct uses
  // such as "for AI research" or "for developers to test language models"
  // remain purpose evidence, as do AI roles above.
  const describedPurpose = purpose.slice(role.length);
  return AI_DESCRIPTION.test(announcingObject)
    || /\bAI[ -]powered\b/i.test(purpose)
    || softwareRole && (AI_DESCRIPTION.test(describedPurpose) || /\bAI\b/i.test(purpose)
      || (!/\bmodels?\b/i.test(role) && hasAIPurpose(purpose)));
}

function affirmativeLaunch(clause: string, publicationYear?: number): RegExpMatchArray | null {
  for (const claim of clause.matchAll(new RegExp(LAUNCH.source, "gi"))) {
    const prefix = evidenceClauses(clause.slice(0, claim.index)).at(-1) || "";
    // Keep appositive and preposed release timing. A direct time complement
    // of another past predicate describes that event, not this launch.
    const object = clause.slice((claim.index || 0) + claim[0].length);
    const timing = `${prefix} ${object}`.replace(/\b(?:trained|developed|founded|built|introduced|released|launched|unveiled)\s+(?:in (?:19|20)\d{2}|last year|(?:\d+|many|several) years? ago)\b/gi, "");
    const datedYear = timing.match(/\bin ((?:19|20)\d{2})\b/i)?.[1];
    const historical = /(?:released|launched|introduced|unveiled)/i.test(claim[0])
      && (/\b(?:last year|(?:\d+|many|several) years? ago)\b/i.test(timing)
        || Boolean(datedYear && Number(datedYear) !== publicationYear));
    const coreRole = (declaredRole(clause) || object.split(/[:,]/)[0])
      .split(/\s+(?:for|of|about|from|using|with|that|which)\s+/i)[0];
    const roleIndex = coreRole.match(ARTIFACT_ROLE)?.index;
    const roleQualifier = coreRole.slice(0, roleIndex);
    const existingArtifact = /\b(?:introduc\w*|announc\w*|meet)$/i.test(claim[0])
      && /\b(?:existing|previously released|already released)\b/i.test(roleQualifier);
    // Uncertainty about the announced object is still uncertainty about the
    // launch. Later purposes or relative clauses have their own predicates.
    const announcedObject = object.split(/[,;:]|\s+(?:for|to|with|that|which)\s+/i)[0];
    if (!NON_AFFIRMATIVE.test(`${prefix} ${announcedObject} ${roleQualifier}`)
      && !historical && !existingArtifact) return claim;
  }
  return null;
}

function anticipatedLaunch(clause: string): boolean {
  return [...clause.matchAll(new RegExp(LAUNCH.source, "gi"))].some((claim) =>
    /\bcan(?:not|[’']t) wait to\s*$/i.test(clause.slice(0, claim.index)));
}

function repeatsArtifactDefinition(clause: string, artifact: string): boolean {
  const defined = clause.match(/^(.{3,100}?)\s+(?:is|are)\s+(?:an?|our|the)\s+/i)?.[1];
  const normalize = (name: string) => name.replace(/^(?:the|our|new|a|an)\s+/i, "").trim().toLowerCase();
  return Boolean(defined && normalize(defined) === normalize(artifact));
}

function identityTokens(text: string): string[] {
  // The retained feed expands this official name ("o" means "omni"). This
  // is identity normalization, never an eligibility or family-name allowlist.
  // https://openai.com/index/hello-gpt-4o/
  const identity = text.replace(/\bGPT[ -]4[ -]Omni\b/gi, "GPT-4o");
  return identity.toLowerCase().match(/[a-z][a-z0-9]*|\d+(?:\.\d+)*(?:[a-z]+)?/g) || [];
}

function containsArtifact(text: string, artifact: string): boolean {
  const tokens = identityTokens(text);
  const identity = identityTokens(artifact);
  return identity.length > 0 && tokens.some((_, index) =>
    identity.every((word, offset) => tokens[index + offset] === word));
}

function availabilitySubject(clause: string): string | null {
  const caption = availabilityCaption(clause);
  if (caption) return caption.name;
  const predicate = clause.match(/\s+(?:is|are)\s+/i);
  if (!predicate || predicate.index === undefined) return null;
  if (NON_AFFIRMATIVE.test(clause.slice(0, predicate.index))) return null;
  const access = clause.slice(predicate.index + predicate[0].length);
  if (!AVAILABLE.test(access)) return null;
  // Remove an appositive, not a comma-separated list of announced products.
  const subject = clause.slice(0, predicate.index).trim().replace(/,$/, "");
  const roleFirstName = subject.match(/^(?:our|the|an?) [^,]+\b(?:models?|assistants?|agents?|products?|tools?|services?),\s*([A-Z][\w .-]+)$/i)?.[1];
  return roleFirstName || subject
    .replace(/,\s*[a-z][^,]*(?:,\s*)?$/, "")
    .replace(/\s+(?:from|by)\s+.*$/i, "").trim();
}

function sameAvailabilityArtifact(availableName: string, headline: string): boolean {
  const normalized = availableName.replace(/^(?:the|our|new|a|an)\s+/i, "");
  if (containsArtifact(headline, normalized)) return true;
  const products = normalized.split(/,\s*(?:and\s+)?|\s+and\s+/i).filter(Boolean);
  if (products.length > 1 && !/\bfamily of models\b/i.test(headline)) {
    // A coordinated claim must match every named product. GPT describes the
    // model class here; it need not occur in the headline's shorter "models".
    return products.every((product) => {
      const words = product.replace(/\b(?:[a-z-]+|GPT)\s+(?=models?\b)/g, "")
        .split(/\s+/).filter((word) => word && !/^(?:the|our|new|models?)$/i.test(word));
      return words.length > 0 && words.every((word) => containsArtifact(headline, word));
    });
  }
  const version = availableName.match(/\d+(?:\.\d+)*/g)?.at(-1);
  const sharedName = availableName.split(/\s+/).some((word) => /^[A-Z][a-zA-Z-]{2,}/.test(word)
    && !/^(?:Our|The|New|Model|AI|Embed|Language|Open|Source)$/.test(word)
    && containsArtifact(headline, word));
  return Boolean(version && containsArtifact(headline, version) && sharedName);
}

export function isModelRelease(article: Pick<Article, "title" | "summary" | "content"> & Partial<Pick<Article, "url" | "published_at">>): boolean {
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
  const canonicalSlug = sourcePath.replace(/\/$/, "").split("/").at(-1)?.replace(/^(?:introducing|announcing|launching|meet)-/, "");
  const canonicalArtifact = canonicalSlug?.replace(/-(?:in|on)-.*$/i, "").replace(/-/g, " ") || "";
  const launchUrl = /\/(?:introducing|announcing|launching|meet)-/i.test(sourcePath);
  const identityWords = canonicalSlug?.split("-").filter((word) => !/^(?:a|an|the|for|and|with|of|ai)$/.test(word)) || [];
  const titleWords = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").split("-");
  const canonicalIdentity = identityWords.length > 0 && identityWords.every((word) => titleWords.includes(word === "vuln" ? "vulnerability" : word));
  const publicationYear = article.published_at ? Number(article.published_at.slice(0, 4)) : undefined;
  const leadClauses = evidenceClauses(lead);
  const openingSentence = leadClauses[0] || "";
  const nextSentence = leadClauses[1] || "";
  const openingLaunch = OPENING_LAUNCH.test(lead)
    && (!LAUNCH.test(openingSentence) || affirmativeLaunch(openingSentence, publicationYear));
  const headlineEvidence = evidenceClauses(headline).find((clause) => affirmativeLaunch(clause, publicationYear)) || headline;
  const headlineClaim = affirmativeLaunch(headlineEvidence, publicationYear);
  // Negated/speculative keywords cannot fall through to name or URL shortcuts.
  const headlineAnticipation = evidenceClauses(headline).some(anticipatedLaunch);
  if (LAUNCH.test(headline) && !headlineClaim && !headlineAnticipation) return false;
  const subject = headlineEvidence.split(/:|(?<!\d),|,(?!\d)|\s+-\s+/)[0];
  const introduced = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?)|open[ -]sourcing)\s+/i.test(subject);
  const name = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?)|open[ -]sourcing)\s+/i, "")
    .replace(/^(?:hello|meet)\s+/i, "")
    .split(/\s+(?:and|is|are|now|on|for|with|in|by|using)\b/i)[0].replace(/[.!?]+$/, "");
  const namedVersion = /[a-z]/i.test(name) && !/^\d/.test(name) && NAMED_VERSION.test(name.replace(/[·•]/g, "-"))
    && !/^(?:with|from|for|on|using|our|the|a|an|before|after|how|why)\b/i.test(name);
  const caption = headlineEvidence.slice(subject.length);
  const captionRole = caption.match(DESCRIPTIVE_LAUNCH);
  if (!headlineClaim && captionRole && NON_AFFIRMATIVE.test(caption.slice(0, captionRole.index))) return false;
  const definedName = lead.match(MODEL_DEFINITION)?.[1].split(/\s+/).slice(0, 2).join(" ");
  const definedModelSubject = Boolean(definedName && subject.toLowerCase().startsWith(definedName.toLowerCase()));
  const headlineRole = declaredRole(headlineEvidence);
  const modelRoleText = (headlineRole || headline).split(/\s+(?:for|using|with)\s+/i)[0];
  const describedModelSubject = /\b(?:(?:AI|foundation|language|vision|audio|speech|image|multimodal|reasoning) models?|VLM|LLM)\b/i.test(modelRoleText);
  const routineToolVersion = /\b(?:cli|sdk|desktop)\b/i.test(title) && !introduced
    && /\bv?\d+\.\d+(?:\.\d+)*(?:\s+released)?$/i.test(title);
  const repositoryTag = article.url?.includes("github.com/") && article.url.includes("/releases/tag/");
  const toolBuild = repositoryTag || /\b(?:cli|sdk|desktop)\b/i.test(title);
  const prereleaseBuild = PRERELEASE_TAG.test(title) && (toolBuild || (!introduced && !describedModelSubject));
  // Judge the announced artifact's purpose, not incidental AI/model mentions.
  // Punctuation and multiple modifiers in a publisher definition are common.
  // A delivery partnership can follow a role-proven artifact launch. An
  // organization/program merely bringing an existing AI platform cannot.
  const openingArtifactLaunch = containsArtifact(openingSentence, name)
    && affirmativeLaunch(openingSentence, publicationYear)
    && ((declaredRole(openingSentence) && announcedPurpose(openingSentence))
      || (headlineClaim && headlineRole && announcedPurpose(headlineEvidence)));
  const nonProductPurpose = /\b(?:hosting|annual)\b[^.!?]*\b(?:event|devday)\b/i.test(lead)
    || (!openingArtifactLaunch && /^this (?:partnership|collaboration|agreement|program)\b/i.test(nextSentence))
    || /\b[\w]+-bench\b/i.test(headline)
    || /\b(?:system card|model spec|safety framework|jam session|cohort|scholars|inference chip|AI infrastructure)\b/i.test(headline)
    || /\b(?:evaluating|how well can)\b/i.test(headline.slice(subject.length))
    || /^(?:Introducing [^,]+,|.{3,80}? (?:is|are) (?:an?|the|our)|we[^.!?]{0,60}(?:announce|announcing))(?:(?!\b(?:models?|tools?|platform|service)\b)[^.!?]){0,100}\b(?:benchmark|office|event)\b/i.test(lead)
    || /\b(?:initiative|founder program|AI infrastructure)\b/i.test(lead.slice(0, 180));
  const evaluationProduct = headlineClaim && headlineRole && announcedPurpose(headlineEvidence)
    && /\b(?:tools?|platforms?|services?|applications?|frameworks?)\b/i.test(headlineRole);
  const benchmarkPerformance = headlineClaim && describedModelSubject && modelNoun(modelRoleText)
    && announcedPurpose(headlineEvidence);
  const subjectClassification = (evaluationProduct ? title.replace(/\bevaluation\b/gi, "") : title)
    .replace(benchmarkPerformance ? /\bbenchmarks?\b/gi : /$^/, "");
  if (nonProductPurpose || VERSION_TAG.test(title) || VERSION_TAG.test(name) || prereleaseBuild || routineToolVersion
    || (repositoryTag && !introduced)
    || (UNRELATED_SUBJECT.test(title) && !definedModelSubject && !describedModelSubject)
    || NON_LAUNCH.test(subjectClassification) || NON_PRODUCT_LAUNCH.test(subject)
    || /\b(?:before|after|prior to|ahead of|since|without|until) (?:the )?(?:release|launch)\b/i.test(headline)
    || NON_PRODUCT_DESCRIPTION.test(lead)) return false;
  const nameWords = name.split(/\s+/).filter((word) => /^[A-Z][\w.-]{2,}$/.test(word));
  const matchesSubject = (clause: string) => name.length > 2 && (containsArtifact(clause, name)
    || (nameWords.length > 1 && nameWords.every((word) => containsArtifact(clause, word))))
    || (launchUrl && canonicalIdentity && containsArtifact(clause, canonicalArtifact));
  const conflictingRole = [headlineEvidence, ...leadClauses].some((clause, index) => {
    const availableName = availabilitySubject(clause);
    if (!matchesSubject(clause) && !(availableName && sameAvailabilityArtifact(availableName, headline))) return false;
    const declaration = declaredRole(clause);
    if (!declaration) return false;
    // Oversight or configuration attached to an AI artifact does not make
    // the artifact itself manual. Bound exclusions to its core declared role.
    const role = declaration.split(/\s+(?:for|of|about|from|using|with|that|which)\s+/i)[0];
    const linkedPurpose = index === 0
      ? leadClauses.some((leadClause) => matchesSubject(leadClause) && announcedPurpose(leadClause))
      : continuationPurpose(...leadClauses.slice(index));
    return (!uninformativeRole(declaration) && !announcedPurpose(clause) && !linkedPurpose) || /\b(?:settings?|configuration)\b/i.test(role)
      || NON_COMPUTATIONAL_MODEL.test(role)
      || /\b(?:manual|hand-operated|human-only|non[ -]AI)\b/i.test(role);
  });
  if (conflictingRole) return false;
  const availability = leadClauses.some((clause, index) => {
    const availableName = availabilitySubject(clause);
    const continuation = leadClauses[index + 1] || "";
    const purpose = announcedPurpose(clause) || announcedPurpose(headlineEvidence)
      || (availableName !== null && repeatsArtifactDefinition(continuation, availableName) && announcedPurpose(continuation))
      || continuationPurpose(...leadClauses.slice(index + 1));
    return availableName !== null && purpose && sameAvailabilityArtifact(availableName, headline);
  });
  // Anticipation is not a release claim. It may coexist with an independent
  // current release/availability assertion, bound to this same artifact.
  if (headlineAnticipation && !availability && !leadClauses.some((clause, index) =>
    matchesSubject(clause) && affirmativeLaunch(clause, publicationYear)
    && (announcedPurpose(clause) || continuationPurpose(...leadClauses.slice(index + 1))))) return false;
  // Launch articles sometimes include a developer guide after the colon. A
  // tutorial or partnership as the subject still cannot become a release.
  const canonicalCaption = launchUrl && canonicalIdentity
    && leadClauses.some((clause) => containsArtifact(clause, canonicalArtifact) && announcedPurpose(clause));
  if (!availability && !canonicalCaption && (INSTRUCTIONAL.test(subject) || (!introduced && INSTRUCTIONAL.test(headline)))) return false;

  // A definition identifies the model; it does not establish a release. For a
  // truncated publisher excerpt, require an explicit new/enhanced capability
  // announcement, and reject definitions describing existing deployments.
  const newCapability = /\b(?:enables?|brings?|advances?)\b[^.!?]*\b(?:new|enhanced|next[ -]generation)\b/i.test(headline);
  if (definedModelSubject && newCapability
    && !/\b(?:already|existing|used in|previously released)\b/i.test(lead)) return true;
  // A publisher can announce an unnumbered open model with a return headline
  // and no excerpt. Require both that launch claim and an AI description.
  if (RETURN_LAUNCH.test(headline) && hasAIPurpose(headline)) return true;
  const launch = headlineClaim;
  const headlineLaunch = launch && ((launch.index ?? 0) < 40
    || /\b(?:now available|now open[ -]source|generally available)\b/i.test(headline));
  // Check the availability clause itself, too: an editorial prefix can precede
  // a model name ("Open intelligence: Example 3 is now open source").
  const availabilityName = headlineEvidence.split(":").at(-1)?.trim().split(/\s+(?:is|are)\b/i)[0] || "";
  const sameSubject = leadClauses.some(matchesSubject);
  const subjectPurpose = leadClauses.some((clause) => matchesSubject(clause) && announcedPurpose(clause))
    || (matchesSubject(openingSentence) && continuationPurpose(...leadClauses.slice(1)))
    || (sameSubject && /^(?:delivers?|offers?|provides?|your (?:teams?|users|customers) get)\b/i.test(openingSentence) && hasAIPurpose(openingSentence));
  const informativeRole = leadClauses.some((clause) => matchesSubject(clause) && declaredRole(clause));
  // A scoped package is an identifiable software artifact; an explicit launch
  // for AI establishes product purpose without a provider/package allowlist.
  const scopedSoftware = /\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?))\s+@[\w.-]+\/[\w.-]+/i.test(headline)
    && /\bfor\b[^.!?]{0,40}\bAI\b/i.test(headline);
  if (headlineLaunch && (/\bmodel availability\b/i.test(launch[0]) || announcedPurpose(headlineEvidence) || scopedSoftware || /\breranker(?:s| family)?\b/i.test(headline) || namedVersion
    || NAMED_VERSION.test(availabilityName)
    || subjectPurpose)) return true;
  if (availability) return true;
  // Editorial headlines may describe the purpose rather than repeat the full
  // named launch. Corroborate multiple meaningful identity words from an
  // explicit opening announcement, plus an AI model/product capability.
  const openingArtifact = lead.match(/^(?:Today[, ]+|We(?:[’'](?:re|ve)| (?:are|have))? )?(?:introducing|announcing|launching|releasing|previewing|preview|meet) (?:the )?([A-Z][^,.!?]{2,90})/i)?.[1]
    .split(/\s+(?:with|is|are|our)\b/i)[0];
  const identity = openingArtifact?.split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 2 && !/^(?:the|for|and|new|our|model|models|tools|tool|from|with)$/i.test(word)) || [];
  const sharedIdentity = identity.filter((word) => headline.toLowerCase().includes(word.toLowerCase()));
  if (openingArtifact && sharedIdentity.length >= 2
    && !/^(?:meet|introducing)\b[^.!?]{0,60}\bexisting\b/i.test(openingSentence)
    && (announcedPurpose(openingSentence) || /\btools?\b/i.test(lead) && /\bconnectors?\b/i.test(lead))) return true;
  // A provider/product can precede the launch verb. For an editorial caption,
  // corroborate the full announcing identity and the explicitly new artifact
  // role, rather than treating an incidental introduced item as a launch.
  const subjectIntroduction = lead.match(/^([^.!?]{3,100}?) introduces? (?:the |an? )?([^,.!?]{3,90})/i);
  const announcingWords = subjectIntroduction?.[1].split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 2 && !/^(?:the|our|new|for|and|with|model|models|tool|tools)$/i.test(word)) || [];
  const newRole = headline.match(/^new (?:AI |agent |coding )?(skill|tool|assistant|agent|model)\b/i)?.[1];
  if (subjectIntroduction && newRole && announcingWords.length >= 2
    && announcingWords.every((word) => headline.toLowerCase().includes(word.toLowerCase()))
    && new RegExp(`\\b${newRole}\\b`, "i").test(subjectIntroduction[2])
    && announcedPurpose(subjectIntroduction[0])) return true;
  // Recall tradeoff for a source-verified sparse preview: the entire excerpt
  // must be an affirmative caption without informative purpose, and the URL
  // must independently identify the same artifact. Never override a role.
  const previewName = lead.trim().match(/^([A-Z][\w -]{2,70}?) (?:is|are) now in (?:public|research) preview[.!?]?$/)?.[1];
  const previewSlug = previewName?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const artifactSlug = sourcePath.replace(/\/$/, "").split("/").at(-1);
  if (previewName && !informativeRole && headline.includes(previewName) && artifactSlug === previewSlug
    && /\/(?:news|blog|products?|platforms?)\//i.test(sourcePath)) return true;
  // A same-subject definition of a NEW tool/model establishes a substantive
  // product launch; a definition describing existing usage does not.
  if (sameSubject && /^.{3,80}? (?:is|are) (?:a |an |our |the )?new\b/i.test(lead)
    && hasAIPurpose(`${headline} ${openingSentence}`)
    && /\b(?:models?|tools?|platform|service|assistant|application)\b/i.test(`${headline} ${openingSentence}`)) return true;
  // Sparse model-family captions identify a released artifact, unlike a bare
  // name or an article mentioning models. Corroborate that identity in the URL.
  const captionName = subject.toLowerCase().replace(/\s+(?:suite|family)$/i, "").replace(/[^a-z0-9]+/g, "-");
  if (!lead && /\b(?:paired encoders and decoders|reasoning models|language models|vision models)\b/i.test(headline.slice(subject.length))
    && /\b(?:SoTA|new|open|state-of-the-art)\b/i.test(headline.slice(subject.length))
    && sourcePath.replace(/\/$/, "").split("/").at(-1) === captionName) return true;

  if (namedVersion && headlineEvidence !== subject) {
    const description = headlineEvidence.slice(subject.length);
    const role = description.match(DESCRIPTIVE_LAUNCH);
    if (role && !NON_AFFIRMATIVE.test(description.slice(0, role.index))) return true;
  }
  const ownedModelUpgrade = /^we(?:[’']re| are)? upgrad(?:e|ing) (?:our|the) (?:[a-z-]+ ){0,3}model\b/i.test(openingSentence);
  const openingObject = lead.slice(lead.match(OPENING_LAUNCH)?.[0].length || 0).trim();
  const implicitModelLaunch = /^(?:an?|our|the) (?:new |updated |upgraded )?(?:AI |foundation |language |vision |audio |speech |image |multimodal |reasoning |generative )?models?\b/i.test(openingObject);
  if (namedVersion && openingLaunch && hasAIPurpose(openingSentence) && (sameSubject || ownedModelUpgrade || implicitModelLaunch)) return true;

  // A preview update can name the model before announcing its updated version.
  // Bind that first-person release claim to the same full base name nearby;
  // an unrelated release or a historical usage mention is not corroboration.
  const baseName = name.replace(/\s+(?:preview|beta|alpha)$/i, "");
  const updateClaim = lead.match(/\bwe(?:[’'](?:re|ve)| (?:are|have))?(?: (?:decided to|(?:are )?(?:excited|pleased|ready) to))?\s+releas(?:e|ing) an? (?:updated|new) version\b/i);
  const baseIndex = lead.toLowerCase().indexOf(baseName.toLowerCase());
  if (namedVersion && !toolBuild && /\bpreview\b/i.test(subject) && updateClaim
    && baseIndex >= 0 && baseIndex < (updateClaim.index ?? 0)
    && (updateClaim.index ?? 0) - (baseIndex + baseName.length) <= 80) return true;

  // An unnumbered name needs a launch claim that names that same subject. This
  // tolerates short navigation prefixes without accepting incidental old-model
  // release mentions in customer stories or research articles.
  if (sameSubject && openingLaunch && subjectPurpose) return true;
  const leadLaunch = lead.match(/\bwe(?:[’'](?:re|ve)| (?:are|have))?(?:\s+[a-z]+){0,5}\s+(?:introduc(?:e|ing)|announc(?:e|ing)|launch(?:ing)?|releas(?:e|ing)|open[ -]sourcing)\b/i);
  if (sameSubject && (subjectPurpose || hasAIPurpose(headline)) && leadClauses.some((clause) => matchesSubject(clause) && affirmativeLaunch(clause, publicationYear)) && leadLaunch && (leadLaunch.index ?? 0) < 150
    && containsArtifact(lead.slice((leadLaunch.index ?? 0) + leadLaunch[0].length), name)) return true;
  // A follow-up availability sentence can refer back to the named artifact's
  // upgraded model; a different named product is not such a reference.
  if (sameSubject && openingSentence.toLowerCase().startsWith(name.toLowerCase())
    && hasAIPurpose(openingSentence)
    && /^(?:it|the (?:new|upgraded|updated) (?:model|agent|assistant|product|tool|service))$/i.test(availabilitySubject(nextSentence) || "")) return true;
  // Some publisher feeds truncate the excerpt; their canonical launch slug
  // supplies corroboration for a model/product description in the headline.
  const launchedName = subject.replace(/^.*\b(?:introduc(?:e|es|ed|ing)|announc(?:e|es|ed|ing)|launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|(?:releas(?:e|es|ed|ing)|preview(?:s|ed|ing)?)|open[ -]sourcing)\s+(?:the )?/i, "").replace(/[.!?]+$/, "");
  const namedProduct = /^[A-Z][\w.-]*(?:\s+(?:[A-Z][\w.-]*|for|of|the|and)){1,4}$/.test(launchedName);
  const nameSlug = launchedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const uninformativeLead = !lead || /\bis an AI safety and research company\b/i.test(lead);
  // When an official feed supplies no useful excerpt, corroborate a proper
  // named launch with the same artifact name in its canonical URL.
  const modelOrProductPath = /\/(?:[^/]*models[^/]*|products?|platforms?)\//i.test(sourcePath);
  const targetAudience = /\bfor [A-Z]/.test(launchedName);
  if (introduced && namedProduct && canonicalSlug === nameSlug
    && ((uninformativeLead && (modelOrProductPath || targetAudience))
      || (targetAudience && hasAIPurpose(openingSentence)))) return true;
  // Sparse open-model captions can put modality words before a numbered name.
  // Require an open-model claim and the same artifact identity in its URL.
  if (uninformativeLead && namedVersion && /\bopen(?:[ -](?:source|weights?))?\b.*\bmodels?\b/i.test(subject)
    && canonicalSlug && canonicalSlug.split("-").every((part) => name.toLowerCase().split(/\W+/).includes(part))) return true;
  const newModelIdentity = /\bnew\b[^.!?]*\bmodel\b/i.test(headline)
    && Boolean(identityWords[0] && titleWords.includes(identityWords[0]));
  const existingUsage = /\b(?:already|existing deployments|used in|previously released)\b/i.test(lead);
  // A canonical announcement can corroborate an abbreviated artifact caption;
  // require the URL to identify this headline's subject, rather than accepting
  // an unrelated AI mention anywhere in an announcement excerpt.
  return Boolean(launchUrl && (canonicalIdentity || newModelIdentity) && !existingUsage
    && (hasAIPurpose(headline) || hasAIPurpose(openingSentence)
      || (OPENING_LAUNCH.test(openingSentence) && continuationPurpose(...leadClauses.slice(1)))));
}

export function modelReleases(articles: Article[]): Article[] {
  return articles.filter(isModelRelease);
}
