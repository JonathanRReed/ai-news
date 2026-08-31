import type { APIRoute } from "astro";
import { allArticles, buildRss, RSS_HEADERS } from "../../lib/feeds.js";
import { entityForArticle } from "../../lib/intelligenceCatalog.js";

export const GET: APIRoute = () => new Response(buildRss({
  title: "AI News Hub - Labs and Providers",
  description: "Primary-source updates from AI labs, model providers, and research organizations.",
  feedPath: "/feed/labs.xml",
  items: allArticles().filter((article) => entityForArticle(article)?.entityType !== "harness"),
  buildDate: new Date().toUTCString(),
}), { headers: RSS_HEADERS });
