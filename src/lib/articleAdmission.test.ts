import { describe, expect, test } from "bun:test";
import { admittedArticles, admittedRouteArticles, isArticleAdmitted } from "./articleAdmission.js";
import type { Article } from "../types/article.js";
import providerArticles from "../../public/data/provider-articles.json";
import deepMindSourceUrls from "../data/deepmind-source-urls.json";

const admitted: Article = {
  id: "admitted",
  company: "OpenAI",
  title: "Admitted update",
  url: "https://openai.com/index/admitted-update/",
  published_at: "2026-08-30T00:00:00.000Z",
  source_type: "rss_official",
  source_url: "https://openai.com/news/rss.xml",
  source_key: "openai-news",
};

describe("article cache admission", () => {
  test("requires source identity, endpoint, company, and canonical host to agree", () => {
    expect(isArticleAdmitted(admitted)).toBeTrue();
    expect(isArticleAdmitted({ ...admitted, url: "https://attacker.example/story" })).toBeFalse();
    expect(isArticleAdmitted({ ...admitted, source_url: "https://attacker.example/feed" })).toBeFalse();
    expect(isArticleAdmitted({ ...admitted, company: "Anthropic" })).toBeFalse();
    expect(isArticleAdmitted({ ...admitted, source_key: "missing-source" })).toBeFalse();
    expect(isArticleAdmitted({ ...admitted, id: "../about" })).toBeFalse();
  });

  test("filters poisoned cache rows before rendering or feed generation", () => {
    expect(admittedArticles([
      admitted,
      { ...admitted, id: "poisoned", url: "https://attacker.example/story" },
    ])).toEqual([admitted]);
  });

  test("uses verified publisher URLs and rejects unknown staging hosts", () => {
    const records = new Map((providerArticles as Article[]).map((article) => [article.id, article]));
    for (const mapping of deepMindSourceUrls) {
      const record = records.get(mapping.id);
      expect(record?.url).toBe(mapping.from);
      expect(record && isArticleAdmitted(record)).toBeTrue();
      expect(admittedArticles([record!])[0]?.url).toBe(mapping.to);
    }
    const record = records.get(deepMindSourceUrls[0].id)!;
    expect(isArticleAdmitted({ ...record, url: "https://unknown.appspot.com/blog/story" })).toBeFalse();
  });

  test("keeps old DeepMind routes while listing each verified source once", () => {
    const rows = (providerArticles as Article[]).filter((article) => article.source_key === "deepmind-blog");
    const routes = admittedRouteArticles(rows);
    const canonical = admittedArticles(rows);
    expect(routes).toHaveLength(deepMindSourceUrls.length);
    expect(canonical).toHaveLength(new Set(deepMindSourceUrls.map((entry) => entry.to)).size);
    expect(new Set(canonical.map((article) => article.url)).size).toBe(canonical.length);
    const pair = rows.filter((article) => [
      "38e1ee58-f110-4626-9ea9-ccd723019442",
      "24cc54f5-2a0c-473f-8ed8-34d8597951f2",
    ].includes(article.id));
    expect(admittedArticles(pair).map((article) => article.id))
      .toEqual(["38e1ee58-f110-4626-9ea9-ccd723019442"]);
  });
});
