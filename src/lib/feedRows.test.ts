import { describe, expect, test } from "bun:test";
import { feedDayLabel, groupFeedDays, groupFeedRows, rowExcerpt, utcClockTime } from "./feedRows.js";
import { buildGroupLabel, isReleaseRecord, recordDisplayTitle, recordKind, recordKindLabel, titleNeedsProject } from "./releaseKind.js";
import type { Article } from "../types/article.js";

function article(id: string, publishedAt: string, company: string, title: string, sourceKey = "example-news"): Article {
  return {
    id,
    company,
    title,
    url: `https://example.com/${id}`,
    published_at: publishedAt,
    source_key: sourceKey,
  };
}

function release(id: string, publishedAt: string, company: string, title: string): Article {
  return article(id, publishedAt, company, title, `${company.toLowerCase().replace(/\s+/g, "-")}-releases`);
}

describe("record kinds", () => {
  test("only release sources can be releases or builds", () => {
    const story = article("a", "2026-09-22T10:00:00Z", "OpenAI", "Introducing a nightly preview of GPT-6 beta");
    expect(isReleaseRecord(story)).toBe(false);
    expect(recordKind(story)).toBe("story");
  });

  test("recognizes a release by its GitHub tag URL or item type", () => {
    expect(isReleaseRecord({ title: "v1.0.0", url: "https://github.com/acme/tool/releases/tag/v1.0.0" })).toBe(true);
    expect(isReleaseRecord({ title: "v1.0.0", url: "https://example.com/x", item_type: "harness_release" })).toBe(true);
  });

  test.each([
    "0.157.0-alpha.11",
    "rust-v0.156.0-alpha.18",
    "Release v0.62.0-nightly.20260923.g62364cb20",
    "release-publish/de32d6b7a12e-1790136680: ci: defer native lifecycle matrices (#156077)",
    "sdk/core/v0.0.85",
    "gdk-v0.1.0-alpha.9: chore(GDK): release v0.1.0-alpha.9 (#11866)",
    "v0.1.5rc3",
    "v0.86.3.dev",
    "nv_dev_f8e8fb5",
  ])("treats %s as a pre-release build", (title) => {
    expect(recordKind(release("b", "2026-09-22T10:00:00Z", "Tool", title))).toBe("build");
  });

  test.each([
    "0.156.1",
    "v2.1.280",
    "SDK v0.0.85",
    "CLI v3.0.63",
    "Hermes Agent v0.21.4 (v2026.9.21)",
    "@moonshot-ai/kimi-code@2.0.2",
    "v2.1.1.post3",
    "Stable release v2.1.0",
    "v2.0.0-vscode",
    "kosong-0.55.0: chore(release): bump kimi-cli to 1.49.0 and kosong to 0.55.0 (#2503)",
  ])("treats %s as a release", (title) => {
    expect(recordKind(release("r", "2026-09-22T10:00:00Z", "Tool", title))).toBe("release");
  });

  test("calls a per-package tag a package release, not a pre-release", () => {
    const pkg = release("p", "2026-09-22T10:00:00Z", "Cline", "sdk/core/v0.2.0");
    const alpha = release("a", "2026-09-22T10:00:00Z", "Cline", "0.3.0-alpha.1");
    expect(recordKindLabel("build", pkg)).toBe("Package release");
    expect(recordKindLabel("build", alpha)).toBe("Pre-release build");
    expect(buildGroupLabel([pkg, pkg])).toBe("2 package releases");
    expect(buildGroupLabel([alpha, alpha, alpha])).toBe("3 pre-release builds");
    expect(buildGroupLabel([pkg, alpha])).toBe("2 builds and package releases");
  });

  test("names the project in labels when the release tag alone would not", () => {
    expect(recordDisplayTitle(release("r", "2026-09-22T10:00:00Z", "Codex CLI", "0.156.1"))).toBe("Codex CLI 0.156.1");
    expect(recordDisplayTitle(release("h", "2026-09-22T10:00:00Z", "Hermes Agent", "Hermes Agent v0.21.4"))).toBe("Hermes Agent v0.21.4");
    expect(recordDisplayTitle(article("s", "2026-09-22T10:00:00Z", "OpenAI", "Introducing GPT-6"))).toBe("Introducing GPT-6");
  });

  test("asks for the project name only when the title omits it", () => {
    expect(titleNeedsProject({ title: "0.156.1", company: "Codex CLI" })).toBe(true);
    expect(titleNeedsProject({ title: "Hermes Agent v0.21.4", company: "Hermes Agent" })).toBe(false);
  });
});

describe("feed rows", () => {
  const feed = [
    release("c3", "2026-09-22T22:16:00Z", "Codex CLI", "0.157.0-alpha.10"),
    article("o1", "2026-09-22T21:00:00Z", "OpenAI", "Better prompt caching for GPT-6"),
    release("c2", "2026-09-22T19:53:00Z", "Codex CLI", "0.156.0"),
    release("c1", "2026-09-22T18:13:00Z", "Codex CLI", "0.157.0-alpha.9"),
    release("g1", "2026-09-22T01:24:00Z", "Gemini CLI", "Release v0.62.0-nightly.20260922.gd5b3e3acc"),
    release("c0", "2026-09-21T23:00:00Z", "Codex CLI", "0.157.0-alpha.4"),
  ];

  test("folds one project's builds on one day into a single row at the newest build", () => {
    const rows = groupFeedRows(feed.slice(0, 5));
    expect(rows.map((row) => (row.type === "builds" ? `builds:${row.articles.map((a) => a.id).join(",")}` : row.article.id))).toEqual([
      "builds:c3,c1",
      "o1",
      "c2",
      "g1",
    ]);
  });

  test("keeps every record reachable and never merges across days", () => {
    const days = groupFeedDays(feed);
    expect(days.map((day) => [day.day, day.count])).toEqual([["2026-09-22", 5], ["2026-09-21", 1]]);
    const ids = days.flatMap((day) => day.rows.flatMap((row) => (row.type === "builds" ? row.articles.map((a) => a.id) : [row.article.id])));
    expect(ids.sort()).toEqual(feed.map((a) => a.id).sort());
    expect(days[1].rows[0].type).toBe("article");
  });

  test("leaves builds unfolded when asked, so a saved build is always its own row", () => {
    const rows = groupFeedRows(feed.slice(0, 5), { foldBuilds: false });
    expect(rows.map((row) => row.type)).toEqual(["article", "article", "article", "article", "article"]);
  });

  test("prints an excerpt only when it says more than the title, and never for a build", () => {
    const stable = { ...release("r", "2026-09-22T10:00:00Z", "Tool", "v1.2.0"), summary: "Release v1.2.0" };
    expect(rowExcerpt(stable)).toBe("");
    expect(rowExcerpt({ ...stable, summary: "Adds a faster diff view for large files." })).toBe("Adds a faster diff view for large files.");
    expect(rowExcerpt({ ...release("b", "2026-09-22T10:00:00Z", "Tool", "v1.3.0-alpha.1"), summary: "Adds a faster diff view for large files." })).toBe("");
  });

  test("labels days on the UTC calendar", () => {
    const now = Date.parse("2026-09-23T03:00:00Z");
    expect(feedDayLabel("2026-09-23", now)).toBe("Today, Wednesday, September 23");
    expect(feedDayLabel("2026-09-22", now)).toBe("Yesterday, Tuesday, September 22");
    expect(feedDayLabel("2026-09-20", now)).toBe("Sunday, September 20");
    expect(feedDayLabel("2025-12-31", now)).toBe("Wednesday, December 31, 2025");
    expect(utcClockTime("2026-09-22T04:06:00Z")).toBe("04:06");
    // A date with no time is stored as midnight UTC and must not be printed as a real time.
    expect(utcClockTime("2026-09-22T00:00:00Z")).toBe("");
    expect(utcClockTime("2026-09-22T00:00:01Z")).toBe("00:00");
  });
});
