import type { APIRoute } from "astro";
import { allArticles, buildRss, RSS_HEADERS } from "../../lib/feeds.js";
import { entityForArticle } from "../../lib/intelligenceCatalog.js";

export const GET: APIRoute = () => new Response(buildRss({
  title: "AI News Hub - Agent Harnesses",
  description: "Official releases from AI agent harnesses, coding agents, and model-provider CLIs.",
  feedPath: "/feed/harnesses.xml",
  items: allArticles().filter((article) => entityForArticle(article)?.entityType === "harness"),
  buildDate: new Date().toUTCString(),
}), { headers: RSS_HEADERS });
