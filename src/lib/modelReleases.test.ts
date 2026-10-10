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
    "Introducing Codex CLI",
    "Introducing Codex CLI v3.0: autonomous coding workflows",
    "Mistral releases Voxtral, its first open source AI audio model",
    "Introducing physics AI at Mistral: the foundation for engineering acceleration.",
  ])("retains model and AI product announcements: %s", (title) => {
    expect(isModelRelease(article(title))).toBe(true);
  });

  test("supports new product names and model rollouts with subject-matched opening text", () => {
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
    expect(isModelRelease(article("Introducing SynthID Bio", "Proof of concept for watermarking AI-generated proteins."))).toBe(false);
    const mislabeled = { ...article("Introducing Mistral Large 4 | Mistral"), item_type: "other" };
    expect(isModelRelease(mislabeled)).toBe(true);
    const mislabeledNews = { ...article("Quarterly quantum releases"), item_type: "model_release" };
    expect(isModelRelease(mislabeledNews)).toBe(false);
  });

  test("retains the verified launch and preserves excluded cache records for the normal feed", () => {
    const all = allArticles();
    const releases = modelReleases(all);
    for (const title of ["Introducing Mistral Large 4 | Mistral", "Introducing Falcon ASR", "Introducing dots"]) {
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
