import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { articleMetaDescription } from "./articleSeo.ts";

const missingSources = [
  "https://huggingface.co/blog/nvidia/model-evaluation-skill",
  "https://huggingface.co/blog/build-small-hackathon/sponsors-vouchers",
];

test("unavailable sources do not invite readers to a removed original", () => {
  const description = articleMetaDescription({ title: "Recorded publisher title" }, "", "huggingface.co", true);
  assert.match(description, /Source unavailable/);
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

test("only the two verified missing URLs are recorded", async () => {
  const ledger = JSON.parse(readFileSync(new URL("../data/unavailable-article-sources.json", import.meta.url), "utf8"));
  assert.deepEqual(ledger.map(({ url }) => url), missingSources);
  const { unavailableArticleSource } = await import("./articleSourceAvailability.mjs");
  for (const url of missingSources) {
    assert.equal(unavailableArticleSource(url)?.checked_at, "2026-10-05");
    assert.equal(unavailableArticleSource(url + "/#comments")?.url, url);
  }
  for (const url of [
    "https://huggingface.co/blog/other-live-post",
    "https://github.com/NVIDIA-NeMo/Evaluator",
    "https://huggingface.co/blog/nvidia/model-evaluation-skill-extra",
    "https://other.example/blog/nvidia/model-evaluation-skill",
    "javascript:alert(1)",
    "",
  ]) assert.equal(unavailableArticleSource(url), null);
});

test("availability does not depend on a route ID or mutate publisher records", async () => {
  const { unavailableArticleSource } = await import("./articleSourceAvailability.mjs");
  const article = Object.freeze({ id: "old-alias", url: missingSources[0], title: "Original title" });
  unavailableArticleSource(article.url);
  assert.deepEqual(article, { id: "old-alias", url: missingSources[0], title: "Original title" });
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
