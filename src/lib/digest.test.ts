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
