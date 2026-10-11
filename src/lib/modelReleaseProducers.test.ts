import { expect, test } from "bun:test";
import { latestModelReleasesPerLab } from "./modelReleaseProducers.js";
import type { Article } from "../types/article.js";

const release = (id: string, company: string, url: string): Article => ({
  id, company, url,
  title: `Introducing ${id}, a language model`,
  published_at: "2026-10-07T16:54:33Z",
});

test("does not credit hosted community releases to the feed owner", () => {
  const community = release("community", "Hugging Face", "https://huggingface.co/blog/LiquidAI/open-d1?utm_source=feed#overview");
  const official = release("official", "Hugging Face", "https://huggingface.co/blog/smolervlm/");
  const openai = release("openai", "OpenAI", "https://openai.com/index/introducing-gpt-6");
  const releases = [community, official, openai];
  const snapshot = JSON.stringify(releases);
  expect(latestModelReleasesPerLab(releases, ["OpenAI", "Hugging Face", "Absent Lab"]))
    .toEqual([{ name: "OpenAI", article: openai }, { name: "Hugging Face", article: official }]);
  expect(JSON.stringify(releases)).toBe(snapshot);
  expect(releases[0].company).toBe("Hugging Face");
});

test("does not invent a producer when only community releases are available", () => {
  expect(latestModelReleasesPerLab([
    release("liquid", "Hugging Face", "https://huggingface.co/blog/LiquidAI/open-d1"),
    release("nvidia", "Hugging Face", "https://huggingface.co/blog/nvidia/openreasoning-nemotron"),
  ], ["Hugging Face", "LiquidAI", "NVIDIA AI"]))
    .toEqual([]);
});

test("preserves catalog order and the latest eligible first-party record", () => {
  const latest = release("latest", "OpenAI", "https://openai.com/index/latest");
  const older = release("older", "OpenAI", "https://openai.com/index/older");
  const hf = release("hf", "Hugging Face", "https://huggingface.co/blog/ettin");
  expect(latestModelReleasesPerLab([latest, older, hf], ["Hugging Face", "OpenAI"]))
    .toEqual([{ name: "Hugging Face", article: hf }, { name: "OpenAI", article: latest }]);
});
