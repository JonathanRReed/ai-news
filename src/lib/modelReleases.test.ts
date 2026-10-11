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

  test.each([
    [false, "ExpenseFlow is an expense-tracking tool for teams that build language models."],
    [false, "ExpenseFlow is an expense-tracking tool for researchers building AI models."],
    [true, "ExpenseFlow is an automated testing tool for developers to test language models."],
    [true, "ExpenseFlow is a visualization tool for researchers to study vision models."],
    [false, "ExpenseFlow is an expense-tracking tool for developers to manage expenses."],
    [true, "ExpenseFlow is an automated auditing tool for AI research."],
    [true, "ExpenseFlow is an AI assistant for teams that manage expenses."],
  ])("separates artifact purpose from its audience: %s %s", (expected, definition) => {
    expect(isModelRelease(article("ExpenseFlow comes to teams", `ExpenseFlow is now available. ${definition}`))).toBe(expected);
    expect(isModelRelease(article("ExpenseFlow comes to teams", definition.replace(/ is (an?) /, " is now available as $1 ")))).toBe(expected);
  });

  test.each([
    [true, "Previewing Aurora mode: GPT-6 at high speed", "Preview Aurora, a new API service tier that runs GPT-6 faster."],
    [true, "Canvas is here", "Our video generation model, Canvas, is now available."],
    [false, "Canvas is here", "Our manual AI tool, Canvas, is now available."],
    [false, "Introducing a quantum processor for language models", ""],
    [true, "Aurora Editor: coding for teams", "We’ve released Aurora Editor, a new AI coding assistant."],
    [true, "Aurora Editor: coding for teams", "We have launched Aurora Editor, a new AI coding assistant."],
    [false, "Aurora Editor: coding for teams", "We haven’t released Aurora Editor, a new AI coding assistant."],
    [false, "Preview v0.65.0-alpha.2", ""],
    [false, "Introducing ExpenseFlow: a non-AI expense tool", ""],
    [false, "Introducing ExpenseFlow: a human-only AI tool", ""],
    [false, "Introducing ExpenseFlow: a manual AI tool", ""],
    [false, "Introducing ExpenseFlow 3.0", "ExpenseFlow 3.0 is a new expense-tracking tool."],
    [false, "Introducing DesktopOS 12.0", "DesktopOS 12.0 is a desktop operating system."],
    [true, "Introducing QubitLM: a language model for quantum calibration", ""],
    [true, "Introducing PlayGen: a generative AI model for gaming", ""],
    [true, "Introducing EvalFlow: an AI evaluation platform", "EvalFlow is a new AI evaluation platform."],
    [false, "Evaluation of GPT-6", "Introducing GPT-6, a new language model."],
    [false, "Introducing EvalFlow: an AI evaluation benchmark", "EvalFlow is an AI evaluation benchmark."],
  ])("shares current launch grammar and artifact-role guards: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [false, "AuroraX comes to CloudBox", "Aurora is now available as a language model."],
    [false, "Aurora 4.5 comes to CloudBox", "Aurora 4 is now available as a language model."],
    [true, "Aurora 4 comes to CloudBox", "Aurora 4 is now available as a language model."],
    [false, "Introducing ExpenseFlow 3.0, an expense tracker", ""],
    [false, "Introducing CalendarFlow 3.0, a calendar app", ""],
    [false, "Introducing GraphicsFlow 3.0, a graphics card", ""],
    [false, "Introducing InvoiceFlow 3.0, an invoicing dashboard", ""],
    [true, "After considering customer feedback, we are releasing Aurora 4, a language model", ""],
    [true, "Aurora 4 comes to CloudBox", "After considering customer feedback, Aurora 4 is now available as a language model."],
    [false, "We are considering releasing Aurora 4, a language model", ""],
    [false, "After considering customer feedback, we might release Aurora 4, a language model", ""],
    [false, "Aurora 4 comes to CloudBox", "After considering customer feedback, Aurora 4 might be available now as a language model."],
    [false, "Aurora 4 comes to CloudBox", "Aurora 4 might be available now as a language model."],
    [false, "Introducing WorkFlex: a new operating model", ""],
    [false, "Introducing CarePath: a new healthcare delivery model", ""],
    [false, "Introducing Subscriptions Plus: a new subscription model", ""],
    [true, "Introducing GraphCoder", "GraphCoder is a tool for developers. It uses a reasoning model to autocomplete code."],
    [false, "Introducing GraphCoder", "GraphCoder is an expense tracker. It is used by teams that build reasoning models."],
    [false, "Introducing GraphCoder", "GraphCoder is a manual coding tool. It uses a reasoning model to autocomplete code."],
    [false, "Introducing GraphCoder", "GraphCoder is a tool for developers. This company builds reasoning models."],
    [true, "Introducing CanvasEdit", "CanvasEdit is an image editing version of Canvas. Built upon an open-source vision model, it extends image editing capabilities."],
    [false, "Introducing CanvasEdit", "CanvasEdit is an image editing version of Canvas. Built upon a subscription model, it changes customer billing."],
    [true, "Introducing GraphCoder", "GraphCoder is an expense tracker. It uses a reasoning model to categorize expenses."],
    [false, "Introducing GraphCoder", "GraphCoder is an expense tracker. It does not use a reasoning model to categorize expenses."],
    [false, "Introducing GraphCoder", "GraphCoder is an expense tracker. It might use a reasoning model to categorize expenses."],
    [true, "Introducing GraphCoder", "GraphCoder is an expense tracker. It does not require configuration; it uses a reasoning model to categorize expenses."],
    [false, "Introducing GraphCoder", "GraphCoder is an expense tracker. This company does not require configuration; it uses a reasoning model to categorize expenses."],
    [true, "Introducing WorkFlex: a language model for operating model design", ""],
    [false, "Aurora 4 in production", "Preview of Aurora 4, a language model released last year."],
    [false, "Aurora 4 in production", "Preview of Aurora 4, a language model."],
    [true, "Previewing Aurora 4", "Preview Aurora 4, a language model."],
  ])("bounds artifact identity, role, and affirmative preview grammar: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [false, "A lab declines to release Aurora 4, a language model", ""],
    [false, "A lab refuses to release Aurora 4, a language model", ""],
    [false, "A lab delays release of Aurora 4, a language model", ""],
    [false, "A lab has yet to release Aurora 4, a language model", ""],
    [false, "A lab cancels release of Aurora 4, a language model", ""],
    [true, "After delaying billing changes, we release Aurora 4, a language model", ""],
    [false, "Premium seats are coming to ChatGPT Business", "Premium seats are now available on ChatGPT Business."],
    [false, "Storage credits come to ChatGPT Business", "Storage credits are now available on ChatGPT Business."],
    [false, "Billing options come to ChatGPT Business", "Billing options are now available on ChatGPT Business."],
    [true, "Aurora 4 comes to CloudBox", "Aurora 4 is now available as a language model on ChatGPT Business."],
    [true, "Aurora 4 Omni: See, Hear, Talk, Write", "We release Aurora 4-Omni, a new multimodal model."],
    [false, "Aurora 4 Omni: See, Hear, Talk, Write", "We release Aurora 4-X, a new multimodal model."],
    [true, "Aurora 4 comes to CloudBox", "Now available: Aurora 4, a language model for reasoning."],
    [true, "Aurora 4 comes to CloudBox", "Available now: Aurora 4, a language model for reasoning."],
    [false, "Aurora 4 comes to CloudBox", "Now available: Vega 4, a language model for reasoning."],
    [false, "Aurora 4 comes to CloudBox", "Not available now: Aurora 4, a language model for reasoning."],
    [false, "ExpenseFlow comes to CloudBox", "Now available: ExpenseFlow, an expense tracker."],
    [false, "ExpenseFlow comes to CloudBox", "Now available: ExpenseFlow, a manual AI tool."],
    [true, "Aurora 3 predicts molecular structures", "Introducing a new AI model for molecular prediction."],
    [false, "Aurora 3 predicts molecular structures", "Introducing Vega 3, a new AI model for molecular prediction."],
    [false, "Hello Aurora-4o", "We are announcing Aurora-4 Omni, our new multimodal model."],
    [false, "Hello Aurora-4o", "We are announcing Aurora-4 Xray, our new multimodal model."],
    [false, "Hello Aurora-4o", "We are announcing Vega-4 Omni, our new multimodal model."],
    [false, "Hello Aurora-4o", "We are announcing Aurora-4.5 Omni, our new multimodal model."],
    [true, "Hello GPT-4o", "We are announcing GPT-4 Omni, our new multimodal model."],
    [false, "Hello GPT-4o", "We are announcing GPT-4 Original, our new multimodal model."],
    [false, "Hello GPT-4o", "We are announcing GPT-4.5 Omni, our new multimodal model."],
    [false, "Hello GPT-4o", "We are announcing Aurora-4 Omni, our new multimodal model."],
    [false, "Hello GPT-4o", "We plan to release GPT-4 Omni, our new multimodal model."],
    [false, "Hello GPT-4o", "We are announcing GPT-4 Omni, a manual expense-tracking tool."],
  ])("binds launch verbs and availability captions to their artifact: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [true, "Introducing Aurora 4", "We're releasing Aurora 4, a language model. This partnership brings it to more developers."],
    [true, "Introducing Aurora 4", "We're releasing Aurora 4, a language model. This collaboration makes it available worldwide."],
    [false, "OpenAI and Greek Government launch ‘OpenAI for Greece’", "OpenAI and the Greek Government have launched “OpenAI for Greece” to bring ChatGPT Edu into secondary schools and support responsible AI learning. This partnership aims to boost AI literacy, fuel local start-ups, and drive national economic growth."],
    [false, "A lab and government launch AI for Country", "A lab and government have launched AI for Country to bring ChatGPT Edu into schools. This partnership boosts AI literacy."],
    [false, "Introducing a partnership for Aurora 4", "We're announcing a partnership. This partnership supports developers of language models."],
    [false, "Introducing Aurora 4", "Aurora 4 is a partnership. This collaboration supports developers of language models."],
    [true, "Introducing Aurora 4, a language model", "Aurora 4 is our most capable release yet."],
    [true, "Introducing Aurora 4, a language model", "Aurora 4 is our most capable model yet."],
    [true, "Introducing Aurora 4, a language model", "Aurora 4 is our most capable tool yet."],
    [true, "Introducing Aurora 4, a language model", "Aurora 4 is our most powerful release to date."],
    [false, "Introducing Aurora 4, a language model", "Aurora 4 is our most capable expense tracker yet."],
    [false, "Introducing Aurora 4, a language model", "Aurora 4 is our most capable operating system yet."],
    [false, "Introducing Aurora 4, a language model", "Aurora 4 is a manual expense-tracking tool."],
  ])("retains explicit model launches with delivery context or qualitative descriptions: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [true, "Despite earlier delays, we release Aurora 4, a language model", ""],
    [true, "Following earlier delays, we release Aurora 4, a language model", ""],
    [false, "We delay release of Aurora 4, a language model", ""],
    [false, "Despite earlier progress, we delay release of Aurora 4, a language model", ""],
    [true, "EchoLink comes to teams", "EchoLink is now available for speech-to-speech interaction."],
    [true, "EchoLink comes to teams", "EchoLink is available now for text-to-image generation."],
    [false, "EchoLink comes to teams", "Vega is now available for speech-to-speech interaction."],
    [false, "EchoLink comes to teams", "EchoLink is not available for speech-to-speech interaction."],
    [false, "Storage credits come to teams", "Storage credits are now available for ChatGPT Business."],
    [false, "Storage credits come to teams", "Storage credits are now available for language models."],
    [false, "ExpenseFlow comes to teams", "ExpenseFlow is now available for researchers building language models."],
    [true, "Introducing Aurora 4: a new language model topping benchmarks", ""],
    [false, "Introducing AuroraBench: a new benchmark for language models", ""],
    [false, "Introducing AuroraBench: a benchmark of language models", ""],
    [false, "Introducing AuroraBench: a language model benchmark", ""],
    [false, "Aurora 4 benchmarks top language models", ""],
    [false, "We released Aurora 4 last year, a language model", ""],
    [false, "Aurora 4 was released in 2020, a language model", ""],
    [false, "Hello Aurora 4", "We released Aurora 4 last year, a language model."],
    [true, "We released Aurora 4 last year; Aurora 4 is now available as a language model", ""],
    [true, "Today we release Aurora 4, a language model", ""],
    [true, "Aurora 4 was released today, a language model", ""],
    [true, "Now everyone can put data to work", "Meet the Data agent in ChatGPT Work. Connect company data and build dashboards with AI."],
    [false, "Now everyone can put data to work", "Meet the expense tracker in ChatGPT Work. Track expenses manually."],
    [false, "Now everyone can put data to work", "Meet the existing Data agent in ChatGPT Work. It was released last year."],
  ])("requires current artifact evidence while preserving launch context: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [true, "Build more natural voice experiences with Aurora-4 in the API", "Aurora-4 is a voice model for speech-to-speech interaction.", "https://example.com/index/introducing-aurora-4-in-the-api"],
    [false, "Build more natural voice experiences with Aurora-4 in the API", "Aurora-4 is a voice model for speech-to-speech interaction.", "https://example.com/index/introducing-vega-4-in-the-api"],
    [false, "Build expense dashboards with ExpenseFlow in the API", "ExpenseFlow is a manual expense tracker. Our company also builds AI models.", "https://example.com/index/introducing-expenseflow-in-the-api"],
  ])("corroborates instructional captions only through same-artifact canonical launches: %s %s", (expected, title, summary, url) => {
    expect(isModelRelease({ title, summary, url })).toBe(expected);
  });

  test("uses publication context for explicitly dated past launches", () => {
    expect(isModelRelease({ title: "We released Aurora 4 in 2020, a language model", summary: "", published_at: "2026-10-11T00:00:00Z" })).toBe(false);
    expect(isModelRelease({ title: "We released Aurora 4 in 2020, a language model", summary: "", published_at: "2020-10-11T00:00:00Z" })).toBe(true);
  });

  test.each([
    [false, "In 2020, we released Aurora 4, a language model", ""],
    [false, "We released Aurora 4, a language model, in 2020", ""],
    [true, "We released Aurora 5, a new language model based on Aurora 4 introduced in 2020", ""],
    [false, "Meet Aurora: our existing AI agent", ""],
    [false, "Introducing Aurora: our existing AI agent", ""],
    [true, "Introducing Aurora: a new AI agent for existing enterprise systems", ""],
    [true, "Introducing Aurora Copilot", "Aurora Copilot is a new AI copilot for software development."],
    [false, "Introducing Aurora Copilot", "Aurora Copilot is a manual copilot for airline crews."],
    [false, "Introducing Aurora Copilot", "Aurora Copilot is a manual AI copilot for software development."],
    [false, "Aurora 4 helps developers meet latency targets, a language model", ""],
    [false, "Aurora 4 models meet enterprise needs, a language model", ""],
    [true, "Meet Aurora 4, a language model", ""],
  ])("binds temporal, existing-artifact, and imperative evidence to the launch: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test.each([
    [true, "We released Aurora 5, a language model trained in 2020"],
    [true, "We released Aurora 5, a language model developed in 2020"],
    [true, "We released Aurora 5, a language model from a lab founded in 2020"],
    [true, "Trained in 2020, we released Aurora 5, a language model"],
    [true, "A lab founded in 2020 released Aurora 5, a language model"],
    [true, "We released Aurora 5, a language model trained last year"],
    [false, "We released Aurora 5, a language model trained in 2020, in 2025"],
    [false, "We released Aurora 5 in 2020, a language model trained in 2026"],
    [false, "In 2020, we released Aurora 5, a language model trained in 2026"],
    [false, "Announcing a possible Aurora 4 release, a language model"],
    [false, "Introducing possibly Aurora 4, a language model"],
    [true, "Introducing Aurora 4, a language model for possible future applications"],
    [false, "Introducing TripMate: a new travel agent"],
    [false, "Introducing HomePro: a real estate agent"],
    [false, "Introducing BondPlus: a chemical agent"],
    [true, "Introducing TripMate: a new AI travel agent"],
    [true, "Introducing TripMate: an AI-powered travel agent"],
    [false, "Introducing TripMate: a manual AI-powered travel agent"],
    [false, "Introducing TripMate: a human-only AI-powered travel agent"],
    [false, "Introducing TripMate: a travel agent for teams using AI-powered research tools"],
  ])("separates descriptive predicates and non-computational roles from launch evidence: %s %s", (expected, title) => {
    expect(isModelRelease({ title, summary: "", published_at: "2026-10-11T00:00:00Z" })).toBe(expected);
  });

  test.each([
    [true, "Introducing GraphCoder", "GraphCoder is a coding-native agent for technical work."],
    [true, "Introducing Aurora Computer Use", "Aurora Computer Use is a specialized model built to power agents that interact with user interfaces."],
    [true, "Introducing Arena, our first ML-Agents environment", ""],
    [false, "Introducing TripMate", "TripMate is a travel agent for researchers who build language models."],
  ])("keeps computational agent qualifiers tied to the core role: %s %s", (expected, title, summary) => {
    expect(isModelRelease(article(title, summary))).toBe(expected);
  });

  test("propagates publication context to independent dated release evidence", () => {
    const release = { title: "We can't wait to introduce Aurora 4", summary: "We released Aurora 4 in 2026, a language model.", published_at: "2026-10-11T00:00:00Z" };
    expect(isModelRelease(release)).toBe(true);
    expect(isModelRelease({ ...release, summary: "We released Aurora 4 in 2020, a language model." })).toBe(false);
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
