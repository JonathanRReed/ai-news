import { describe, expect, test } from "bun:test";
import { admittedArticles, isArticleAdmitted } from "./articleAdmission.js";
import type { Article } from "../types/article.js";

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
  });

  test("filters poisoned cache rows before rendering or feed generation", () => {
    expect(admittedArticles([
      admitted,
      { ...admitted, id: "poisoned", url: "https://attacker.example/story" },
    ])).toEqual([admitted]);
  });
});
