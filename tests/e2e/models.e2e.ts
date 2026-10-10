import { expect, test } from "@playwright/test";

test("selects AI launches consistently in model timeline and lab cards", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/models/");
  await expect(page).toHaveTitle("AI Model Release Timeline | AI News Hub");
  await expect(page.getByText("Model announcements and AI product launches from official feeds, including model previews.", { exact: false })).toBeVisible();

  const timeline = page.locator("main ol");
  const cards = page.locator("main article");
  await expect(timeline.getByRole("link", { name: "Introducing Mistral Large 4 | Mistral", exact: true })).toBeVisible();
  await expect(cards.getByRole("link", { name: "Introducing Mistral Large 4 | Mistral", exact: true })).toBeVisible();
  await expect(cards.getByRole("link", { name: "GPT-6 and Intelligent UI for everyone", exact: true })).toBeVisible();
  await expect(timeline.getByRole("link", { name: "Introducing dots", exact: true })).toBeVisible();
  for (const title of ["Rally Up: ‘Gears of War: E-Day’ Launches on GeForce NOW", "What's new at IBM Quantum Q3 2026", "rust-v0.163.0-alpha.6"]) {
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  }
  const cardLinks = await cards.locator('a[href^="/article/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(cardLinks).size).toBe(cardLinks.length);
  expect(await timeline.locator("li").count()).toBe(60);
  const dates = await timeline.locator("time").evaluateAll((times) => times.map((time) => Date.parse(time.getAttribute("datetime") || "")));
  expect(dates).toEqual([...dates].sort((a, b) => b - a));

  // Page selection must not remove any of these records from the normal feed.
  const feed = await request.get("/data/provider-feed.json");
  const articles = await feed.json() as Array<{ title: string }>;
  for (const title of ["What's new at IBM Quantum Q3 2026", "rust-v0.163.0-alpha.6"]) {
    expect(articles.some((article) => article.title === title)).toBe(true);
  }
  expect(errors).toEqual([]);
});
