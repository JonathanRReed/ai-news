import type { APIRoute } from "astro";
import { allArticles, buildRss, RSS_HEADERS } from "../../lib/feeds.js";
import { majorUpdates } from "../../lib/majorUpdates.js";

export const GET: APIRoute = () => new Response(buildRss({
  title: "AI News Hub - Major Updates",
  description: "Named model releases and major agent-tool versions from official sources.",
  feedPath: "/feed/major.xml",
  items: majorUpdates(allArticles()).map(({ article }) => article),
  buildDate: new Date().toUTCString(),
}), { headers: RSS_HEADERS });
