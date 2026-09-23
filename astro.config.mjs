import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { articleSourceIdentity } from "./src/lib/articleSourceIdentity.mjs";

const SITE = "https://ai-news.helloworldfirm.com";

// Build lastmod lookups from the same cache the pages consume, so the sitemap carries
// real recrawl signals for article and weekly-digest URLs.
const providerArticles = JSON.parse(
  readFileSync(new URL("./public/data/provider-articles.json", import.meta.url), "utf8")
);
const legacyArticles = JSON.parse(
  readFileSync(new URL("./src/data/legacy-article-records.json", import.meta.url), "utf8")
);
const articleLastmod = new Map();
const weekLastmod = new Map();
const currentSourceIds = new Set(providerArticles.map((article) => articleSourceIdentity(article.url)));
for (const a of providerArticles) {
  const d = new Date(a.published_at);
  if (Number.isNaN(d.getTime())) continue;
  const iso = d.toISOString();
  articleLastmod.set(`${SITE}/article/${a.id}/`, iso);
  const dayFromMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayFromMonday))
    .toISOString()
    .slice(0, 10);
  const weekUrl = `${SITE}/digest/${monday}/`;
  const prev = weekLastmod.get(weekUrl);
  if (!prev || iso > prev) weekLastmod.set(weekUrl, iso);
}
for (const article of legacyArticles) {
  if (currentSourceIds.has(articleSourceIdentity(article.url))) continue;
  const date = new Date(article.published_at);
  if (!Number.isNaN(date.getTime())) {
    articleLastmod.set(`${SITE}/article/${article.id}/`, date.toISOString());
  }
}

export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]]
      }
    }),
    sitemap({
      filter: (page) => !page.startsWith(`${SITE}/article/`) || articleLastmod.has(page),
      serialize(item) {
        const lastmod = articleLastmod.get(item.url) ?? weekLastmod.get(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      }
    })
  ],
  output: "static",
  site: "https://ai-news.helloworldfirm.com",
  build: {
    inlineStylesheets: "auto",
    assets: "_astro"
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      minify: "esbuild",
      cssMinify: true
    },
    ssr: {
      noExternal: ["@tanstack/react-query"]
    }
  }
});
