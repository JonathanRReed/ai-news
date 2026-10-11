import { describe, expect, test } from "bun:test";
import fixtures from "./modelReleases.fixtures.json";
import { isModelRelease, modelReleases } from "./modelReleases.js";

const article = (title: string, summary = "") => ({ title, summary });

describe("model release page eligibility", () => {
  test.each([
    "Introducing Mistral Large 4 | Mistral",
    "Introducing Claude Haiku 5.5 on AWS",
    "Introducing Falcon ASR",
    "Introducing Qwen3.8",
    "Introducing a new language model",
    "Open-sourcing AstaBrief, the fast report-generation model in Asta",
    "Qwen3.8: a new generation of intelligence",
    "GPT-6 Astra: A new generation of intelligence",
    "EmbeddingGemma 2: an open multimodal embedding model",
    "Embed 5: Frontier Embedding Models for Enterprise | Cohere",
    "Enterprise AI: Introducing Cohere North | Cohere",
    "Grok 4.7 is now available on Amazon Bedrock",
    "Open General Intelligence: MiniMax H3 Is Now Open Source - MiniMax News",
    "Introducing workspace agents in ChatGPT",
    "Introducing Gemini 4 public preview",
    "Introducing Aurora 3.0-preview",
    "SmolVLM Grows Smaller – Introducing the 256M & 500M Models!",
    "Launching a new AI assistant",
    "Introducing Aurora 3: a new language model",
    "Introducing Aurora 3: a language model for quantum calibration",
    "Introducing Aurora 3: a language model for CPU inference",
    "A lab returns with Aurora: an open-source language model",
    "Introducing Gemma 3n: The developer guide",
    "Mistral releases Voxtral, its first open source AI audio model",
    "Introducing physics AI at Mistral: the foundation for engineering acceleration.",
  ])("retains model and AI product announcements: %s", (title) => {
    expect(isModelRelease(article(title))).toBe(true);
  });

  test("supports new product names and model rollouts with subject-matched opening text", () => {
    expect(isModelRelease(article("Introducing Codex CLI", "Codex CLI is an AI coding assistant."))).toBe(true);
    expect(isModelRelease(article("Introducing Codex CLI v3.0: autonomous coding workflows", "Codex CLI is an AI coding assistant."))).toBe(true);
    expect(isModelRelease(article("Launching OpenHands", "OpenHands is an agentic AI platform for software development."))).toBe(true);
    expect(isModelRelease(article("Introducing dots", "Dots by OpenAI are proactive assistants that keep working across projects."))).toBe(true);
    expect(isModelRelease(article("GPT-6 and Intelligent UI for everyone", "GPT‑6 is rolling out globally in ChatGPT."))).toBe(true);
  });

  test.each([
    [true, "Sentinel Security is an AI application security agent with manual approval for patches."],
    [true, "Sentinel Security is an AI coding assistant with a manual review workflow."],
    [false, "Sentinel Security is a manual expense-tracking tool."],
    [false, "Sentinel Security is a human-only expense-tracking tool."],
  ])("separates artifact operation from human oversight: %s %s", (expected, summary) => {
    expect(isModelRelease(article("Introducing Sentinel Security", summary))).toBe(expected);
  });

  test.each([
    [true, "Aurora 3 comes to CloudBox", "Aurora 3 is now generally available. Aurora 3 is a language model."],
    [false, "Aurora 3 comes to CloudBox", "Aurora 3 is now generally available. Vega 3 is a language model."],
    [false, "Aurora 3 comes to CloudBox", "Aurora 3 is now generally available. Aurora 3 is a manual expense-tracking tool."],
    [false, "We can't wait to introduce Aurora 4", "Aurora 4 is our new language model."],
    [true, "We can't wait to introduce Aurora 4", "Aurora 4 is now available as a language model."],
    [false, "We cannot wait to release Aurora 4", "We plan to release Aurora 4, our language model, next month."],
    [true, "We cannot wait to release Aurora 4", "Today we release Aurora 4, a language model."],
    [false, "We can't introduce Aurora 4", "Aurora 4 is our new language model."],
    [false, "We can't wait to not introduce Aurora 4", "Aurora 4 is our new language model."],
  ])("connects affirmative launch grammar and exact repeated identity: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test("corroborates unnumbered reasoning and modality-conversion product launches", () => {
    expect(isModelRelease(article("Announcing Aurora Plus for sovereignty", "Aurora Plus delivers advanced reasoning with a minimal compute footprint."))).toBe(true);
    expect(isModelRelease(article("Palette launches SketchFlow", "SketchFlow is a new sketch-to-image tool."))).toBe(true);
    expect(isModelRelease(article("Introducing EchoLink", "EchoLink provides speech-to-speech interaction."))).toBe(true);
    expect(isModelRelease(article("Announcing Aurora Plus", "A different product delivers advanced reasoning."))).toBe(false);
    expect(isModelRelease(article("Palette launches SummerFlow", "A different platform has a sketch-to-image tool."))).toBe(false);
    expect(isModelRelease(article("Introducing CompanyMixer", "CompanyMixer is a hand-operated mixing tool."))).toBe(false);
  });

  test.each([
    "Rally Up: Gears of War: E-Day Launches on GeForce NOW",
    "What's new at IBM Quantum Q3 2026",
    "Introducing a quantum processor",
    "Mistral launches a regional office",
    "MiniMax launches new hardware",
    "rust-v0.163.0-alpha.6",
    "Release v0.65.0-nightly.20261010.g9b6e0265d",
    "Release v0.64.0-preview.1",
    "openclaw 2026.10.1-beta.2",
    "Claude Code v3.0.0-rc.1 released",
    "release-publish/2b988ee83444-1791449196",
    "v2.1.295",
    "Codex CLI v3.0.0",
    "Codex CLI v3.1.0 released",
    "How to launch an app with GPT-6",
    "Announcing a partnership with Mistral",
    "Announcing a strategic collaboration for generative AI",
    "Introducing the OpenAI Partner Network",
    "NVIDIA Introduces New Jetson Thor Computers for Physical AI",
    "With GPT-5, Wrtn builds lifestyle AI for millions",
    "Predicting model behavior before release by simulating deployment",
    "Launching a game: powered by GPT-6",
    "Announcing a data center with GPT-6 support",
    "Introducing a report about Claude",
    "GPT-6: lessons from enterprise adoption",
    "A lab is back with a report on open source language models",
    "Serve Aurora 3, a frontier model, on your server",
    "NarrateAI: production-ready LLM quality assurance on Amazon Bedrock",
    "Meta Llama: Everything you need to know about the open generative AI model",
    "Reproducing Variance: Caching in Agentic LLM Pipelines | AI21",
    "NVIDIA Vera CPU: Olympus Cores Built for Agentic AI",
    "National Security and Public Sector Advisory Council",
    "Musk denies awareness of Grok images as California AG launches probe",
    "NVIDIA Releases Nemotron-CC-Math Pre-Training Dataset",
    "GPT-2: 6-month follow-up",
    "Claude Frontier Academy: $100M to train 10,000 engineers",
    "Introducing ChatGPT Futures: Class of 2026",
    "Introducing Olmo-core 3: Open, scalable training infrastructure for large MoEs",
  ])("excludes general news and routine build records: %s", (title) => {
    expect(isModelRelease(article(title, "Introducing GPT-6, our latest model release."))).toBe(false);
  });

  test("body mentions and source categories do not establish a launch", () => {
    expect(isModelRelease(article("Aurora powers real-time transcription", "Aurora is an open source speech model used in existing deployments."))).toBe(false);
    expect(isModelRelease(article("Aurora enables real-time transcription", "Aurora is an open source speech model designed to transcribe audio..."))).toBe(false);
    expect(isModelRelease(article("Aurora powers enhanced transcription in existing deployments", "Aurora is an open source speech model used in existing deployments."))).toBe(false);
    expect(isModelRelease(article("AI safety report", "Today we discuss the release of GPT-6."))).toBe(false);
    expect(isModelRelease(article("GLM-5.3 and the spread of advanced cyber capabilities", "GLM-5.3 was released without safeguards."))).toBe(false);
    expect(isModelRelease(article("Introducing Claude Corps", "Claude Corps is a national fellowship."))).toBe(false);
    expect(isModelRelease(article("NVIDIA Aurora enables quantum calibration with enhanced learning", "NVIDIA Aurora Calibration is an open source vision language model (VLM)."))).toBe(true);
    expect(isModelRelease(article("A vendor’s quantum computing update", "Aurora is an open source vision language model (VLM)."))).toBe(false);
    expect(isModelRelease(article("Introducing Labs", "Our new division incubates experimental AI products."))).toBe(false);
    expect(isModelRelease(article("Introducing SynthID Bio", "Proof of concept for watermarking AI-generated proteins."))).toBe(false);
    const mislabeled = { ...article("Introducing Mistral Large 4 | Mistral"), item_type: "other" };
    expect(isModelRelease(mislabeled)).toBe(true);
    const mislabeledNews = { ...article("Quarterly quantum releases"), item_type: "model_release" };
    expect(isModelRelease(mislabeledNews)).toBe(false);
  });

  test("supports unnumbered names and general availability without a family allowlist", () => {
    expect(isModelRelease(article("Introducing aurora-open", "We’re releasing aurora-open, an open-weight language model."))).toBe(true);
    expect(isModelRelease(article("Aurora-Image: Native Text Rendering", "MODELS DEMO We are thrilled to release Aurora-Image, a new image foundation model."))).toBe(true);
    expect(isModelRelease(article("Aurora 2 Lite is now ready for production", "Aurora 2 Lite, previously in preview, is now stable and generally available. This model is ready for production."))).toBe(true);
    expect(isModelRelease(article("Guide to Aurora-Image", "We are releasing Aurora-Image, a new image model."))).toBe(false);
    expect(isModelRelease(article("Bring Aurora 3 to everyday work", "Aurora 3 from a new lab is now generally available. This model is ready for production."))).toBe(true);
    expect(isModelRelease(article("A customer’s Aurora 3 deployment", "A different model is now available. Aurora 3 helps our customers."))).toBe(false);
    expect(isModelRelease(article("Aurora 3 and changing cyber risks", "Aurora 3 was released without safeguards, like other models."))).toBe(false);
  });

  test("corroborates sparse named launches and abbreviated availability claims", () => {
    expect(isModelRelease({ ...article("Introducing Aurora Omni"), url: "https://lab.example/models/aurora-omni/" })).toBe(true);
    expect(isModelRelease(article("Introducing Aurora Omni"))).toBe(false);
    expect(isModelRelease({ ...article("Multimodal open z9 decision models for the edge"), url: "https://lab.example/blog/open-z9" })).toBe(true);
    expect(isModelRelease({ ...article("Open models for edge devices"), url: "https://lab.example/blog/open-z9" })).toBe(false);
    expect(isModelRelease({ ...article("How open z9 models power a customer deployment"), url: "https://lab.example/blog/open-z9" })).toBe(false);
    expect(isModelRelease({ ...article("Introducing a new initiative"), url: "https://lab.example/news/introducing-a-new-initiative" })).toBe(false);
    expect(isModelRelease(article("Aurora 3 retrospective", "People are now using an earlier version of Aurora 3 after a rollback."))).toBe(false);
    expect(isModelRelease(article("Search video using Aurora 3.0", "NewLab Aurora Embed 3.0 is now generally available as an embedding model."))).toBe(true);
    expect(isModelRelease(article("Search video using Aurora 3.0", "DifferentLab Vega Embed 3.0 is now generally available as an embedding model."))).toBe(false);
    expect(isModelRelease(article("Introducing a new partner network", "Our new partner network will fund deployment of generative AI."))).toBe(false);
  });

  test("distinguishes newly defined artifacts from benchmarks, events, and existing usage", () => {
    expect(isModelRelease(article("Spectra: An open-source AI auditing tool", "Spectra is a new open-source automated auditing tool for AI research."))).toBe(true);
    expect(isModelRelease(article("Spectra: An open-source AI auditing tool", "Spectra is an open-source auditing tool used in existing deployments."))).toBe(false);
    expect(isModelRelease(article("Introducing the Aurora Reranker Family"))).toBe(true);
    expect(isModelRelease(article("1,000 Scientist AI Jam Session", "Researchers meet for an AI event."))).toBe(false);
    expect(isModelRelease(article("2027: A year of AI models"))).toBe(false);
    expect(isModelRelease({ ...article("Introducing ScienceCheck", "Introducing ScienceCheck, an expert-authored, expert-reviewed benchmark for evaluating AI systems."), url: "https://lab.example/introducing-sciencecheck" })).toBe(false);
    expect(isModelRelease(article("Introducing Aurora 4", "Aurora 4 is a new language model that outperforms previous models on the ScienceCheck benchmark."))).toBe(true);
    expect(isModelRelease({ ...article("Customers using Aurora", "Existing deployments use Aurora, a language model."), url: "https://lab.example/introducing-other-product" })).toBe(false);
  });

  test("corroborates editorial launch identity and substantive public product previews", () => {
    expect(isModelRelease(article("Advancing Aurora in healthcare and science", "Introducing Aurora for Healthcare with new tools and connectors."))).toBe(true);
    expect(isModelRelease(article("A customer using Aurora in healthcare", "Introducing Different for Healthcare with new tools and connectors."))).toBe(false);
    expect(isModelRelease(article("Advancing private AI compute with memory", "Introducing private, server-side memory to an AI architecture."))).toBe(false);
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Flows is now in public preview."), url: "https://lab.example/news/flows/" })).toBe(true);
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Different is now in public preview."), url: "https://lab.example/news/flows/" })).toBe(false);
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Flows is now in public preview."), url: "https://lab.example/news/other-product/" })).toBe(false);
    expect(isModelRelease({ ...article("SDK v0.4.0-beta.2", "SDK is now in public preview."), url: "https://github.com/lab/sdk/releases/tag/v0.4.0-beta.2" })).toBe(false);
  });

  test("binds a mid-excerpt updated-preview release to the named artifact", () => {
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Aurora 2.5 Pro, so we decided to release an updated version early."))).toBe(true);
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Different 2.5 Pro, so we decided to release an updated version early."))).toBe(false);
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Aurora 2.5 Pro. We discuss an updated version released previously."))).toBe(false);
  });

  test("uses canonical path identity despite tracking queries and fragments", () => {
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Flows is now in public preview."), url: "https://lab.example/news/flows/?utm_source=feed" })).toBe(true);
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Flows is now in public preview."), url: "https://lab.example/news/flows/#overview" })).toBe(true);
    expect(isModelRelease({ ...article("Flows for work that runs the business", "Flows is now in public preview."), url: "not a URL" })).toBe(false);
  });

  test("requires an affirmative updated-version release claim", () => {
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Aurora 2.5 Pro, but we’re not releasing an updated version this cycle."))).toBe(false);
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Aurora 2.5 Pro, but we decided not to release an updated version."))).toBe(false);
    expect(isModelRelease(article("Aurora 2.5 Pro Preview: improved coding", "Developers use Aurora 2.5 Pro, and we might release an updated version someday."))).toBe(false);
  });

  test("recognizes scoped software artifacts explicitly launched for AI", () => {
    expect(isModelRelease(article("Introducing @newlab/kernels: GPU operations for Local AI"))).toBe(true);
    expect(isModelRelease(article("Introducing @newlab/runner: software tools for enterprise AI"))).toBe(true);
    expect(isModelRelease(article("Introducing @vendor/tracker: issue tracking for teams", "Our customers sometimes use AI models."))).toBe(false);
    expect(isModelRelease(article("Introducing @newlab/checks: a benchmark for Local AI"))).toBe(false);
  });

  test("binds available-now claims to the same model and affirmative access", () => {
    expect(isModelRelease(article("How to use Aurora 3", "Aurora 3 is available now as an AI model."))).toBe(true);
    expect(isModelRelease(article("How to use Aurora 3", "A different model is available now for API users."))).toBe(false);
    expect(isModelRelease(article("How to use Aurora 3", "Aurora 3 is not available now as an AI model."))).toBe(false);
    expect(isModelRelease(article("How to use Aurora 3", "Aurora 3 may be available now as an AI model."))).toBe(false);
    expect(isModelRelease(article("Aurora in production", "Aurora is an AI speech model used in existing deployments. A companion dashboard is available now."))).toBe(false);
    expect(isModelRelease(article("Aurora 3 in production", "Aurora 3 is an AI speech model used in existing deployments. A companion dashboard is available now."))).toBe(false);
    expect(isModelRelease(article("Aurora language model access remains delayed and is not available now"))).toBe(false);
    expect(isModelRelease(article("The new Aurora Images is here", "The new Aurora Images is powered by our image generation model. The upgraded model is rolling out to users today."))).toBe(true);
    expect(isModelRelease(article("Aurora in production", "Aurora is an AI speech model used in existing deployments. A companion dashboard is now available."))).toBe(false);
  });

  test("corroborates lowercase and subject-prefixed artifact announcements", () => {
    expect(isModelRelease(article("Bringing sign language AI to users", "Introducing sign-language-to-text, our new translation model."))).toBe(true);
    expect(isModelRelease(article("Bringing sign language AI to users", "Introducing different-language-to-audio, our new translation model."))).toBe(false);
    expect(isModelRelease(article("New agent skill: Nova Studio generative AI inference", "Nova Studio generative AI inference introduces the nova-ml skill for coding agents."))).toBe(true);
    expect(isModelRelease(article("New agent skill: Nova Studio generative AI inference", "Different Product introduces the nova-ml skill for coding agents."))).toBe(false);
    expect(isModelRelease(article("New agent skill: Nova Studio generative AI inference", "Nova Studio generative AI inference introduces a dashboard for coding agents."))).toBe(false);
  });

  test.each([
    "GPT-6 is not available now",
    "Aurora 4 is not yet generally available",
    "GPT-6 might be available now",
    "Aurora 4 may become generally available",
    "Aurora 4 will be available now",
    "We are not introducing Aurora 4",
    "We might introduce Aurora 4",
    "Aurora 4: not now in research preview",
  ])("requires affirmative headline launch evidence: %s", (title) => {
    expect(isModelRelease(article(title))).toBe(false);
  });

  test.each([
    ["Model downloads get faster for enterprise users", "Introducing faster model downloads for enterprise users, a network setting for our existing platform."],
    ["New tool: Acme Studio", "Acme Studio introduces an expense-tracking tool. Our team uses AI models elsewhere."],
    ["Introducing Acme Studio", "Acme Studio is a new expense-tracking tool. Our team uses AI models elsewhere."],
    ["Introducing ExpenseFlow", "ExpenseFlow is an expense-tracking tool. A separate application uses AI models."],
    ["Faster downloads for Aurora models", "Introducing faster downloads for Aurora models, a new network setting for the existing platform."],
    ["Introducing ExpenseFlow", "Introducing ExpenseFlow, an expense-tracking tool. Other products deliver advanced reasoning."],
  ])("binds AI purpose to the announced artifact: %s", (title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(false);
  });

  test.each([
    "now available",
    "now stable and generally available",
    "now generally available",
    "available now",
    "rolling out to users today",
  ])("recognizes affirmative same-model availability modifiers: %s", (availability) => {
    expect(isModelRelease(article("The new Aurora Images is here", `The new Aurora Images is powered by our image generation model. The upgraded model is ${availability}.`))).toBe(true);
    expect(isModelRelease(article("The new Aurora Images is here", `The new Aurora Images is powered by our image generation model. A companion dashboard is ${availability}.`))).toBe(false);
  });

  test.each([
    "not available now",
    "not yet generally available",
    "not now stable and generally available",
    "possibly available now",
    "expected to be generally available",
  ])("rejects non-affirmative same-model availability modifiers: %s", (availability) => {
    expect(isModelRelease(article("The new Aurora Images is here", `The new Aurora Images is powered by our image generation model. The upgraded model is ${availability}.`))).toBe(false);
  });

  test.each(["public", "research"])("includes substantive %s product previews", (kind) => {
    const summary = `Sentinel Security is our AI application-security agent. It is now in ${kind} preview.`;
    expect(isModelRelease(article(`Sentinel Security: now in ${kind} preview`, summary))).toBe(true);
    expect(isModelRelease(article("Sentinel Security", summary))).toBe(true);
    expect(isModelRelease(article("Sentinel Security", `Sentinel Security is our AI application-security agent. Another product is now in ${kind} preview.`))).toBe(false);
    expect(isModelRelease(article(`Sentinel Security: not now in ${kind} preview`, "Sentinel Security is our AI application-security agent."))).toBe(false);
    expect(isModelRelease(article(`ExpenseFlow: now in ${kind} preview`, "ExpenseFlow is an expense-tracking tool. We use AI models elsewhere."))).toBe(false);
    expect(isModelRelease({ ...article(`Flows for work that runs the business`, `Flows is now in ${kind} preview.`), url: "https://lab.example/news/flows/" })).toBe(true);
  });

  test.each([
    ["OpenAI models, Codex, and Managed Agents come to AWS", "OpenAI GPT models, Codex, and Managed Agents are now available on AWS."],
    ["Aurora models, Sentinel, and Managed Agents come to CloudBox", "Aurora GPT models, Sentinel, and Managed Agents are now stable and generally available on CloudBox."],
    ["Aurora 4 and Vega 3 come to CloudBox", "Aurora 4 and Vega 3 are now available as language models on CloudBox."],
  ])("preserves coordinated availability subjects: %s", (title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(true);
    expect(isModelRelease(article(title, summary.replace("are now", "are not now")))).toBe(false);
    expect(isModelRelease(article("Different products come to CloudBox", summary))).toBe(false);
  });

  test.each([
    "GPT-6 isn’t available now",
    "Considering introducing Aurora 4",
    "A possible release of Aurora 4",
  ])("does not confuse uncertainty with a headline claim: %s", (title) => {
    expect(isModelRelease(article(title))).toBe(false);
  });

  test.each([
    "If Aurora 4 is available now as a language model, teams can use it.",
    "We don’t think Aurora 4 is available now as a language model.",
    "We might find Aurora 4 is now generally available as a language model.",
  ])("checks the full availability clause’s polarity: %s", (summary) => {
    expect(isModelRelease(article("Aurora 4 in production", summary))).toBe(false);
  });

  test.each([
    ["Introducing model downloads", "Introducing model downloads, a network setting for the existing platform."],
    ["Introducing ModelGate", "ModelGate is a network setting for model downloads."],
    ["Introducing faster downloads for Aurora models", "Introducing faster downloads for Aurora models."],
    ["Introducing ExpenseFlow", "ExpenseFlow is an expense-tracking tool while our team uses AI models elsewhere."],
  ])("uses the artifact’s declared role instead of model-related operations: %s", (title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(false);
  });

  test("requires every coordinated product rather than one overlapping name", () => {
    expect(isModelRelease(article("OpenAI models, Codex, and Managed Agents come to AWS", "OpenAI GPT models, Different, and Managed Agents are now available on AWS."))).toBe(false);
  });

  test("keeps a confirmed launch when uncertainty concerns later features", () => {
    expect(isModelRelease(article("Introducing Aurora 4", "Aurora 4 is a new language model. Additional features might arrive later."))).toBe(true);
    expect(isModelRelease(article("Aurora 4 in production", "Aurora 4 is now generally available as a language model. Other tools may arrive later."))).toBe(true);
  });

  test.each([
    [false, "GPT-6 is not available now, but introducing updated billing", "", ""],
    [false, "Aurora 4: a possible new language model", "", ""],
    [false, "Introducing ExpenseFlow", "ExpenseFlow is a new expense tool. This company builds language models.", ""],
    [false, "ExpenseFlow comes to teams", "ExpenseFlow is now available. This company builds language models.", ""],
    [false, "Aurora downloads come to teams", "Aurora downloads are now available as a download setting for language models.", ""],
    [false, "Research Toolkit is now in public preview", "Research Toolkit is now in public preview, an editing tool for manual tax reports.", "https://lab.example/blog/research-toolkit"],
    [true, "Aurora 4 comes to CloudBox", "Pricing will change and Aurora 4 is now available as a language model.", ""],
    [true, "Aurora 4 comes to CloudBox", "We are not changing pricing, and Aurora 4 is now available as a language model.", ""],
    [true, "Aurora and Vega models come to CloudBox", "Aurora and Vega language models are now available on CloudBox.", ""],
    [true, "Aurora 4 comes to CloudBox", "Aurora 4 is now available as a language model and will gain more tools later.", ""],
    [true, "Aurora 4 comes to CloudBox", "Aurora 4, our new language model, is now generally available.", ""],
    [false, "Aurora 4 comes to CloudBox", "Vega 4 is now available as a language model. Aurora 4 is not available.", ""],
  ])("keeps clause identity, polarity, and purpose together: %s %s", (eligible, title, summary, url) => {
    expect(isModelRelease({ ...article(title, summary), url })).toBe(eligible);
  });

  test("keeps sparse official previews separate from role-proven releases", () => {
    const url = "https://lab.example/news/flows/";
    expect(isModelRelease({ ...article("Flows for everyday work", "Flows is now in public preview."), url })).toBe(true);
    expect(isModelRelease({ ...article("Flows for everyday work", "Flows is now in research preview."), url })).toBe(true);
    expect(isModelRelease({ ...article("Flows for everyday work", "Flows is now in public preview, software used for manual tax editing."), url })).toBe(false);
    expect(isModelRelease({ ...article("Flows for everyday work", "Flows is now in public preview. Flows is an expense tool. Our company builds language models."), url })).toBe(false);
    expect(isModelRelease({ ...article("Flows for everyday work", "Flows is now in public preview."), url: "https://lab.example/news/other/" })).toBe(false);
  });

  test("classifies frozen publisher inputs from the source and review audit", () => {
    for (const { article, eligible } of fixtures) {
      expect({ title: article.title, eligible: isModelRelease(article) }).toEqual({ title: article.title, eligible });
    }
  });

  test("filters without removing or changing records in the normal news collection", () => {
    const articles = fixtures.map(({ article }) => ({ ...article }));
    const snapshot = JSON.stringify(articles);
    const releases = modelReleases(articles);
    expect(releases).toEqual(fixtures.filter(({ eligible }) => eligible).map(({ article }) => article));
    expect(JSON.stringify(articles)).toBe(snapshot);
    expect(articles.length).toBe(fixtures.length);
  });
});
