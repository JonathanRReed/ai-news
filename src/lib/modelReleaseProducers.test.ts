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

test("credits the verified Hugging Face organization without changing its source record", () => {
  const community = release("community", "Hugging Face", "https://huggingface.co/blog/LiquidAI/open-d1");
  const organization = release("organization", "Hugging Face", "https://huggingface.co/blog/huggingface/new-release/?utm_source=feed#overview");
  const older = release("older", "Hugging Face", "https://huggingface.co/blog/older-release");
  const records = [community, organization, older];
  const snapshot = JSON.stringify(records);
  expect(latestModelReleasesPerLab(records, ["Hugging Face"]))
    .toEqual([{ name: "Hugging Face", article: organization }]);
  expect(records.filter((article) => latestModelReleasesPerLab([article], ["Hugging Face"]).length === 0))
    .toEqual([community]);
  expect(JSON.stringify(records)).toBe(snapshot);
});

test.each([
  "https://huggingface.co.evil.example/blog/huggingface/new-release",
  "https://evil.huggingface.co/blog/huggingface/new-release",
  "https://huggingface.co/blog/huggingface-other/new-release",
  "https://huggingface.co/blog/huggingface.evil/new-release",
  "https://huggingface.co/blog/LiquidAI/new-release",
  "https://huggingface.co/blog/huggingface/new-release/extra",
  "https://huggingface.co/blog/huggingface/",
  "https://huggingface.co/blog/huggingface//new-release",
  "https://huggingface.co/blog/huggingface/new%2Frelease",
  "https://huggingface.co/blog/huggingface/new%5Crelease",
  "not a URL",
])("does not credit lookalike or malformed producer paths: %s", (url) => {
  expect(latestModelReleasesPerLab([release("candidate", "Hugging Face", url)], ["Hugging Face"]))
    .toEqual([]);
});
