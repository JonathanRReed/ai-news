import { expect, test } from "bun:test";
import { fetchSavedArticles } from "./fetchArticlesPage.js";
import { admittedArticles } from "../lib/articleAdmission.js";
import type { Article } from "../types/article.js";
import providerArticles from "../../public/data/provider-articles.json";

test("saved archive lookup resolves a retained source alias to its exported report", async () => {
  const canonical = admittedArticles((providerArticles as Article[]).filter((article) => [
    "23517512-d27f-5bed-8711-af9838e4868a",
    "f625fa71-efb5-5520-a965-d9f94c0a2f0e",
  ].includes(article.id)))[0];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = Object.assign(async () => new Response(JSON.stringify([canonical]), {
    headers: { "content-type": "application/json" },
  }), { preconnect: originalFetch.preconnect });
  try {
    expect((await fetchSavedArticles(["f625fa71-efb5-5520-a965-d9f94c0a2f0e"])).map((article) => article.id))
      .toEqual(["23517512-d27f-5bed-8711-af9838e4868a"]);
    expect(await fetchSavedArticles(["unrelated-route"])).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
