import type { APIRoute } from "astro";
import { allArticles, buildRss, RSS_HEADERS } from "../lib/feeds.js";

export const GET: APIRoute = () =>
  new Response(
    buildRss({
      title: "AI News Hub",
      description: "Primary-source AI news, releases and research from major labs and model providers.",
      feedPath: "/feed.xml",
      items: allArticles(),
      buildDate: new Date().toUTCString(),
    }),
    { headers: RSS_HEADERS }
  );
