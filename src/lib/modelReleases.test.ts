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
