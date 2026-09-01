import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  await page.route("https://arejerdupcduqhgdoyht.supabase.co/**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"unavailable"}' });
  });
  page.on("console", (message) => {
    const expectedDegradedFetch = message.text().includes("503 (Service Unavailable)");
    if (message.type() === "error" && !expectedDegradedFetch) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => page.locator('astro-island[component-url*="ArticlesIslandWrapper"]').evaluate((element) => !element.hasAttribute("ssr"))).toBe(true);
  expect(errors).toEqual([]);
});

test("keeps the verified cache usable when the live feed is degraded", async ({ page }) => {
  const status = page.getByRole("status").filter({ hasText: "Live updates are temporarily unavailable" });
  await expect(status).toContainText("Showing the verified cache from");
  await expect(page.locator("article a[href^='http']").first()).toBeVisible();
});

test("renders the primary-source feed and searchable filters", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("free intelligence index");
  await expect(page.getByRole("searchbox", { name: "Search articles" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search articles" }).fill("OpenAI");
  await expect(page).toHaveURL(/\?q=OpenAI$/);
  await expect(page.getByRole("button", { name: "Clear search" })).toBeVisible();
});

test("separates labs, harnesses, major updates, and daily digests", async ({ page }) => {
  await page.goto("/labs/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("moving the field");
  await expect(page.getByText("Z.AI", { exact: true })).toBeVisible();

  await page.goto("/harnesses/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("models become tools");
  await expect(page.getByText("Hermes Agent", { exact: true })).toBeVisible();
  await expect(page.getByText("OpenClaw", { exact: true })).toBeVisible();

  await page.goto("/major-updates/");
  await expect(page.getByText("Promotion rule", { exact: true })).toBeVisible();
  await expect(page.getByText("Named model version announced or released").first()).toBeVisible();

  await page.goto("/digest/daily/");
  await expect(page.getByText(/Daily intelligence digest/i)).toBeVisible();
  await expect(page.getByText("Every cached primary-source update published on this UTC date")).toBeVisible();
});

test("keeps entity watchlists local and exposes stable machine feeds", async ({ page, request }) => {
  await page.goto("/entities/z-ai/");
  const watch = page.getByRole("button", { name: "Watch Z.AI" });
  await expect(watch).toBeVisible();
  await expect(watch).toBeEnabled();
  await watch.click();
  await expect(page.getByRole("button", { name: "Watching Z.AI" })).toBeVisible();

  await page.goto("/watchlist/");
  await expect(page.getByRole("button", { name: "Watching Z.AI" })).toBeVisible();

  const rss = await request.get("/feed/entity/z-ai.xml");
  expect(rss.status()).toBe(200);
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  expect(await rss.text()).toContain("<title>AI News Hub - Z.AI</title>");

  const json = await request.get("/feed/entity/z-ai.json");
  expect(json.status()).toBe(200);
  expect((await json.json()).version).toBe("https://jsonfeed.org/version/1.1");

  const fallback = await request.get("/data/provider-feed.json");
  expect(fallback.status()).toBe(200);
  const fallbackArticles = await fallback.json() as Array<{ summary?: string; content?: string }>;
  expect(fallbackArticles.length).toBeGreaterThan(300);
  expect(fallbackArticles.every((article) => !("content" in article))).toBe(true);
  expect(Math.max(...fallbackArticles.map((article) => article.summary?.length ?? 0))).toBeLessThanOrEqual(500);
});

test("keeps legacy article routes and feed-builder share links stable", async ({ page }) => {
  const legacyResponse = await page.goto("/article/0ba607a0-f1ac-434a-a626-f37675170a53/");
  expect(legacyResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A milestone in expanding access to AI");

  await page.goto("/feeds/");
  const feedBuilder = page.locator('astro-island[component-url*="FeedBuilderIsland"]');
  await expect.poll(async () => feedBuilder.evaluate((element) => !element.hasAttribute("ssr"))).toBe(true);
  const entitySelect = page.getByLabel("Entity feed");
  const entityPanel = entitySelect.locator("xpath=ancestor::section[1]");
  const shareLink = entityPanel.getByRole("link", { name: "Share filtered view" });

  await entitySelect.selectOption("hermes-agent");
  await expect(shareLink).toHaveAttribute("href", "/entities/hermes-agent/");

  await entitySelect.selectOption("z-ai");
  await expect(shareLink).toHaveAttribute("href", "/?company=Z.AI");
});

test("keeps oversized publisher posts to a concise source preview", async ({ page }) => {
  await page.goto("/article/efe208e3-4851-5d75-9d87-6ceabaf36672/");

  const preview = page.locator("main article p").filter({ hasText: "Hermes Agent v0.21.0" });
  await expect(preview).toBeVisible();
  const previewText = (await preview.textContent())?.trim() ?? "";

  expect(previewText.length).toBeLessThanOrEqual(500);
  expect(previewText.endsWith("...")).toBe(true);
  await expect(page.getByRole("link", { name: /Read the original on github\.com/i })).toBeVisible();
});

test("publishes crawlable story indexes and a real 404", async ({ page }) => {
  await page.goto("/stories/");
  await expect(page.getByRole("heading", { level: 1, name: /All primary-source stories/i })).toBeVisible();
  await expect(page.locator('a[href^="/article/"]')).not.toHaveCount(0);

  const response = await page.goto("/codex-release-check-not-found");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("uses native modal dialogs for keyboard help", async ({ page, isMobile }) => {
  test.skip(isMobile, "The keyboard-help affordance is desktop-only");
  await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(page.locator('dialog[open][aria-label="Keyboard shortcuts"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("uses a native mobile navigation dialog without horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The mobile navigation is only hydrated below 768 pixels");
  const menuButton = page.getByTestId("mobile-menu-button");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  const dialog = page.getByRole("dialog", { name: "Mobile navigation" });
  await expect(dialog).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});
