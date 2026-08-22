import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => page.locator('astro-island[component-url*="ArticlesIslandWrapper"]').evaluate((element) => !element.hasAttribute("ssr"))).toBe(true);
  expect(errors).toEqual([]);
});

test("renders the primary-source feed and searchable filters", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Primary-source AI news");
  await expect(page.getByRole("searchbox", { name: "Search articles" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search articles" }).fill("OpenAI");
  await expect(page).toHaveURL(/\?q=OpenAI$/);
  await expect(page.getByRole("button", { name: "Clear search" })).toBeVisible();
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
