import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { articleMetaDescription } from "./articleSeo.ts";

const missingSources = [
  "https://huggingface.co/blog/nvidia/model-evaluation-skill",
  "https://huggingface.co/blog/build-small-hackathon/sponsors-vouchers",
  "https://cohere.com/blog/ai-in-oil-and-gas",
];

test("unavailable sources do not invite readers to a removed original", () => {
  const description = articleMetaDescription({ title: "Recorded publisher title" }, "", "huggingface.co", true);
  assert.equal(description, "Recorded publisher title. Source unavailable.");
  assert.doesNotMatch(description, /Read the original/);
});

test("article pages and cards suppress confirmed unavailable source links", () => {
  for (const path of ["../pages/article/[id].astro", "../components/ArticleListIsland.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /unavailableArticleSource/);
    assert.match(source, /Source unavailable/);
    assert.match(source, path.endsWith(".astro")
      ? /originalUrl && !sourceUnavailable/
      : /safeUrl = sourceUnavailable \? "" : getSafeArticleUrl/);
  }
});

test("only verified missing URLs are recorded with their check dates", async () => {
  const ledger = JSON.parse(readFileSync(new URL("../data/unavailable-article-sources.json", import.meta.url), "utf8"));
  assert.deepEqual(ledger.map(({ url }) => url), missingSources);
  const { unavailableArticleSource } = await import("./articleSourceAvailability.mjs");
  for (const url of missingSources) {
    assert.equal(unavailableArticleSource(url)?.checked_at,
      url === "https://cohere.com/blog/ai-in-oil-and-gas" ? "2026-10-07" : "2026-10-05");
    assert.equal(unavailableArticleSource(url + "/#comments")?.url, url);
  }
  for (const url of [
    "https://huggingface.co/blog/other-live-post",
    "https://github.com/NVIDIA-NeMo/Evaluator",
    "https://huggingface.co/blog/nvidia/model-evaluation-skill-extra",
    "https://other.example/blog/nvidia/model-evaluation-skill",
    "https://cohere.com/blog/embed-5",
    "https://cohere.com/blog/ai-in-oil-and-gas-extra",
    "https://other.example/blog/ai-in-oil-and-gas",
    "javascript:alert(1)",
    "",
  ]) assert.equal(unavailableArticleSource(url), null);
});

test("availability does not depend on a route ID or mutate publisher records", async () => {
  const { unavailableArticleSource } = await import("./articleSourceAvailability.mjs");
  const article = Object.freeze({ id: "old-alias", url: missingSources[0], title: "Original title" });
  unavailableArticleSource(article.url);
  assert.deepEqual(article, { id: "old-alias", url: missingSources[0], title: "Original title" });
  const cohereArticle = Object.freeze({
    id: "e4fb6b08-0233-54a1-8c6e-6cfb429c0299",
    url: "https://cohere.com/blog/ai-in-oil-and-gas",
    title: "AI in oil and gas: Transforming safety and efficiency",
    summary: "Oil and gas companies leverage generative AI to boost productivity, optimize predictive maintenance, and enhance worker safety.",
    published_at: "2026-09-30T00:00:00+00:00",
  });
  const originalRecord = { ...cohereArticle };
  assert.equal(unavailableArticleSource(cohereArticle.url)?.checked_at, "2026-10-07");
  assert.deepEqual(cohereArticle, originalRecord);
});

test("available-source metadata and real publisher excerpts remain unchanged", () => {
  assert.equal(
    articleMetaDescription({ title: "Recorded publisher title" }, "", "huggingface.co"),
    "Recorded publisher title. Read the original at huggingface.co.",
  );
  assert.equal(
    articleMetaDescription({ title: "Recorded publisher title" }, "A preserved publisher excerpt.", "huggingface.co", true),
    articleMetaDescription({ title: "Recorded publisher title" }, "A preserved publisher excerpt.", "huggingface.co"),
  );
});

test("site copy credits provenance without promising every source is available", () => {
  const footer = readFileSync(new URL("../components/Footer.astro", import.meta.url), "utf8");
  assert.match(footer, /Every story credits its original source/);
  assert.doesNotMatch(footer, /Every story links to its original source/);
  for (const path of ["../pages/index.astro", "../pages/about.astro", "../pages/stories/[...page].astro"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /link to the original source for each story|every entry links to the original post|links to each original source|direct source links/);
  }
});
