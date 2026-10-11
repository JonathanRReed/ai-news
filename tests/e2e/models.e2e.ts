import { expect, test } from "@playwright/test";
import { articlePath } from "../../src/lib/articleRoutes.js";
import { readFileSync } from "node:fs";
import { decodePublisherPunctuation } from "../../src/lib/publisherText.js";
import type { Article } from "../../src/types/article.js";
import { isModelRelease, modelReleases } from "../../src/lib/modelReleases.js";
import { latestModelReleasesPerLab } from "../../src/lib/modelReleaseProducers.js";

test("selects eligible releases consistently in the timeline and lab cards", async ({ page, request }) => {
  const feed = await request.get("/data/provider-feed.json");
  expect(feed.ok()).toBe(true);
  const articles = await feed.json() as Article[];
  const cached = JSON.parse(readFileSync(new URL("../../public/data/provider-articles.json", import.meta.url), "utf8")) as Article[];
  const byId = new Map(cached.map((article) => [article.id, article]));
  // Admission and canonical titles/URLs come from the served news feed; use the
  // original publisher excerpt rather than the feed's display-length excerpt.
  const all = articles.map((entry) => {
    const original = byId.get(entry.id)!;
    expect(original).toBeDefined();
    return { ...entry, summary: decodePublisherPunctuation(original.summary || ""),
      content: decodePublisherPunctuation(original.content || "") };
  }).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || b.id.localeCompare(a.id));
  const catalog = JSON.parse(readFileSync(new URL("../../src/data/intelligence-catalog.json", import.meta.url), "utf8")) as {
    entities: Array<{ name: string; slug: string; status: string; entityType: string }>;
    sources: Array<{ active: boolean; entitySlug: string }>;
  };
  const active = new Set(catalog.sources.filter((source) => source.active).map((source) => source.entitySlug));
  const labs = catalog.entities.filter((entity) => entity.status === "active" && entity.entityType !== "harness" && active.has(entity.slug));
  const releases = modelReleases(all);
  const expectedTimeline = releases.slice(0, 60);
  const expectedCards = latestModelReleasesPerLab(releases, labs.map((company) => company.name))
    .map(({ article }) => article);
  expect(releases.length).toBeGreaterThan(0);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/models/");
  await expect(page).toHaveTitle("AI Model Release Timeline | AI News Hub");
  await expect(page.getByText("Model announcements and AI product launches from official feeds, including model previews and substantive product previews.", { exact: false })).toBeVisible();

  const timeline = page.locator("main ol");
  const cards = page.locator("main article");
  const articleLinks = (locator: typeof timeline) => locator.locator('a[href^="/article/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(await articleLinks(timeline)).toEqual(expectedTimeline.map((article) => articlePath(article.id)));
  const cardLinks = await articleLinks(cards);
  expect(cardLinks).toEqual(expectedCards.map((article) => articlePath(article.id)));
  expect(new Set(cardLinks).size).toBe(cardLinks.length);
  expect([...expectedTimeline, ...expectedCards].every(isModelRelease)).toBe(true);
  expect(await timeline.locator("li").count()).toBe(expectedTimeline.length);
  const dates = await timeline.locator("time").evaluateAll((times) => times.map((time) => Date.parse(time.getAttribute("datetime") || "")));
  expect(dates).toEqual([...dates].sort((a, b) => b - a));

  // Excluded records remain available to the normal feed; no current title is
  // required to remain a lab's latest release after a future feed refresh.
  for (const article of all.filter((article) => !isModelRelease(article)).slice(0, 3)) {
    expect(articles.some((entry) => entry.id === article.id)).toBe(true);
    await expect(page.locator(`main a[href="${articlePath(article.id)}"]`)).toHaveCount(0);
  }
  // A community publisher remains in the source-attributed timeline and news
  // feed, but cannot replace the hosting platform's own latest-release card.
  const community = releases.filter((article) => article.company === "Hugging Face"
    && /^\/blog\/[^/]+\/[^/]+/.test(new URL(article.url).pathname));
  for (const article of community) {
    const link = `a[href="${articlePath(article.id)}"]`;
    await expect(cards.locator(link)).toHaveCount(0);
    expect(articles.some((entry) => entry.id === article.id && entry.company === "Hugging Face")).toBe(true);
    if (expectedTimeline.some((entry) => entry.id === article.id)) {
      await expect(timeline.locator("li").filter({ has: page.locator(link) })).toContainText("Hugging Face");
    }
  }
  expect(errors).toEqual([]);
});
