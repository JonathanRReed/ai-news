import { describe, expect, test } from "bun:test";
import { digestWeeks } from "./digest.js";
import type { Article } from "../types/article.js";

function article(id: string, publishedAt: string, company: string): Article {
  return {
    id,
    company,
    title: `Update ${id}`,
    url: `https://example.com/${id}`,
    published_at: publishedAt,
    source_url: "https://example.com/feed.xml",
    source_key: "example-feed",
  };
}

describe("weekly news pages", () => {
  test("show the latest stories without provider weighting", () => {
    const stories = [
      article("old-famous", "2026-08-24T08:00:00.000Z", "OpenAI"),
      article("new-small", "2026-08-30T08:00:00.000Z", "Small Lab"),
      article("middle", "2026-08-28T08:00:00.000Z", "Another Lab"),
    ];

    const [week] = digestWeeks(1, 1, stories);

    expect(week.topStories.map((story) => story.id)).toEqual([
      "new-small",
      "middle",
      "old-famous",
    ]);
  });

  test("breaks equal publication timestamps by stable id order", () => {
    const stories = [
      article("alpha", "2026-08-30T08:00:00.000Z", "Lab A"),
      article("zulu", "2026-08-30T08:00:00.000Z", "Lab B"),
    ];

    const [week] = digestWeeks(1, 1, stories);

    expect(week.topStories.map((story) => story.id)).toEqual(["zulu", "alpha"]);
  });
});

describe("weekly short list", () => {
  test("leaves pre-release builds out while still counting them", () => {
    const build: Article = {
      ...article("build", "2026-08-30T09:00:00.000Z", "Tool"),
      title: "0.157.0-alpha.11",
      source_key: "tool-releases",
    };
    const stories = [build, article("news", "2026-08-29T08:00:00.000Z", "Lab")];

    const [week] = digestWeeks(1, 1, stories);

    expect(week.count).toBe(2);
    expect(week.topStories.map((story) => story.id)).toEqual(["news"]);
    expect(week.buildsOmitted).toBe(true);
    // A week of nothing but builds lists them and makes no claim about leaving them out.
    const [buildsOnly] = digestWeeks(1, 1, [build]);
    expect(buildsOnly.topStories.map((story) => story.id)).toEqual(["build"]);
    expect(buildsOnly.buildsOmitted).toBe(false);
  });
});
