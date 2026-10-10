import { describe, expect, test } from "bun:test";
import { allArticles } from "./feeds.js";
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
    "Launching a new AI assistant",
    "Introducing Aurora 3: a new language model",
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
    "Launching a game: powered by GPT-6",
    "Announcing a data center with GPT-6 support",
    "Introducing a report about Claude",
    "GPT-6: lessons from enterprise adoption",
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
    expect(isModelRelease(article("AI safety report", "Today we discuss the release of GPT-6."))).toBe(false);
    expect(isModelRelease(article("GLM-5.3 and the spread of advanced cyber capabilities", "GLM-5.3 was released without safeguards."))).toBe(false);
    expect(isModelRelease(article("Introducing Claude Corps", "Claude Corps is a national fellowship."))).toBe(false);
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

  test("retains the verified launch and preserves excluded cache records for the normal feed", () => {
    const all = allArticles();
    const releases = modelReleases(all);
    for (const title of ["Introducing Mistral Large 4 | Mistral", "Introducing Falcon ASR", "Introducing dots", "Claude Opus 4.6", "Introducing gpt-oss", "Introducing the Agents API", "Introducing North Small Translate | Cohere", "Introducing Claude for Small Business", "Robostral Navigate: single-camera AI navigation | Mistral AI", "Bring near-Astra intelligence to everyday work with GPT-6.1 Sol on Amazon Bedrock", "Amazon Bedrock expands Claude model availability to in-country inferencing in India", "Qwen-Image: Crafting with Native Text Rendering", "Introducing Gemma 3n: The developer guide", "Gemini 2.5 Flash-Lite is now ready for scaled production use", "Stable Audio 3.0, the model family built with open-weight models — Stability AI", "Stability AI Introduces Stable Audio 2.5, the First Audio Model Built for Enterprise Sound Production at Scale — Stability AI", "Stable Video 4D — Stability AI", "Introducing GPT-Rosalind for life sciences research", "Introducing NV-Reason-CT Open 3D CT VLM for Radiologist Chain-of-Thought Reasoning"]) {
      expect(releases.some((a) => a.title === title)).toBe(true);
    }
    for (const title of ["rust-v0.163.0-alpha.6", "What's new at IBM Quantum Q3 2026", "Rally Up: ‘Gears of War: E-Day’ Launches on GeForce NOW"]) {
      expect(all.some((a) => a.title === title)).toBe(true);
      expect(releases.some((a) => a.title === title)).toBe(false);
    }
    expect(allArticles()).toEqual(all);
    expect(releases).toEqual(all.filter(isModelRelease));
  });
});
