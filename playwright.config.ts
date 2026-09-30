import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4377",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // The verify workflow opts in only after building the public test configuration.
    command: process.env.PLAYWRIGHT_USE_EXISTING_BUILD === "1"
      ? "bun run preview:cloudflare"
      : "bun run build && bun run preview:cloudflare",
    url: "http://127.0.0.1:4377",
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ASTRO_DEV_BACKGROUND: "0",
      PUBLIC_SUPABASE_URL: "https://arejerdupcduqhgdoyht.supabase.co",
      PUBLIC_SUPABASE_ANON_KEY: "playwright-public-key",
    },
  },
});
