import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

const SITE = "https://ai-news.helloworldfirm.com";

// Build lastmod lookups from the same cache the pages consume, so the sitemap carries
// real recrawl signals for article and weekly-digest URLs.
const providerArticles = JSON.parse(
  readFileSync(new URL("./public/data/provider-articles.json", import.meta.url), "utf8")
);
const articleLastmod = new Map();
const weekLastmod = new Map();
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

export default defineConfig({
  integrations: [
    tailwind(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]]
      }
    }),
    sitemap({
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
    build: {
      cssCodeSplit: true,
      minify: "esbuild",
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("@tanstack")) {
                return "vendor-react";
              }
              return "vendor";
            }
          }
        }
      }
    },
    ssr: {
      noExternal: ["@tanstack/react-query"]
    }
  }
});
