import { describe, expect, test } from "bun:test";
import { admittedArticles, admittedRouteArticles, isArticleAdmitted } from "./articleAdmission.js";
import type { Article } from "../types/article.js";
import providerArticles from "../../public/data/provider-articles.json";
import deepMindSourceUrls from "../data/deepmind-source-urls.json";
import duplicateSourceUrls from "../data/duplicate-source-urls.json";

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

  test("decodes punctuation from admitted publisher records", () => {
    const article = admittedArticles([{
      ...admitted,
      title: "A new model &mdash; from OpenAI",
      summary: "It&rsquo;s available&nbsp;today for testing.",
    }])[0];
    expect(article.title).toBe("A new model — from OpenAI");
    expect(article.summary).toBe("It’s available today for testing.");
  });

  test("uses verified publisher URLs and rejects unknown staging hosts", () => {
    const records = new Map((providerArticles as Article[]).map((article) => [article.id, article]));
    for (const mapping of deepMindSourceUrls) {
      const record = records.get(mapping.id);
      expect([mapping.from, mapping.to]).toContain(record?.url ?? "");
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

  test("keeps renamed publisher routes while listing the verified source once", () => {
    const records = new Map((providerArticles as Article[]).map((article) => [article.id, article]));
    for (const mapping of duplicateSourceUrls) {
      const record = records.get(mapping.id)!;
      expect(record.url).toBe(mapping.from);
      expect(admittedRouteArticles([record])[0].url).toBe(mapping.to);
    }
    const pair = [
      records.get("74f18a33-9ad5-47ba-aa9c-561802c31834")!,
      records.get("9e43f13e-fdd5-4e9c-a226-69dbf542615e")!,
    ];
    expect(admittedRouteArticles(pair)).toHaveLength(2);
    expect(admittedArticles(pair).map((article) => article.id))
      .toEqual(["74f18a33-9ad5-47ba-aa9c-561802c31834"]);

    for (const [canonicalId, aliasId] of [
      ["3d741c8f-4d82-4a85-967f-7562c68ad796", "5e656241-ff8f-43b7-a8a4-c6f520a311b1"],
      ["f10cc9d5-ea3f-4fa3-baf2-1b722bf9aace", "1bfec398-1782-4a06-92eb-454f48568f9b"],
      ["f8c50092-ca62-4718-8455-4f40092113d5", "65c6057f-d7cd-4654-8e34-5999104c77ae"],
      ["d3a7c0ab-14b9-4d2e-8f02-51cfbcc89e8c", "9d7eb3db-a50d-4cef-b68f-c5fce6f668b2"],
      ["6a7da9d1-29cb-49cc-b7e7-a0e0ff958b19", "9f42fb80-3333-4377-8f12-002bb78dad30"],
    ]) {
      const routes = [records.get(canonicalId)!, records.get(aliasId)!];
      expect(admittedRouteArticles(routes)).toHaveLength(2);
      expect(admittedArticles(routes).map((article) => article.id)).toEqual([canonicalId]);
    }
  });
});
