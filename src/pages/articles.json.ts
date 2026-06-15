import type { APIRoute } from "astro";
import { allArticles, JSON_HEADERS, SITE_URL } from "../lib/feeds.js";
import { deriveTopics } from "../lib/articleTags.js";

export const GET: APIRoute = () => {
  const articles = allArticles()
    .slice(0, 300)
    .map((a) => ({
      id: a.id,
      company: a.company,
      title: a.title,
      url: a.url,
      published_at: a.published_at,
      source_type: a.source_type,
      summary: a.summary ?? "",
      topics: deriveTopics(a),
      permalink: `${SITE_URL}/article/${a.id}/`,
    }));
  return new Response(
    JSON.stringify({ site: "AI News Hub", generated_at: new Date().toISOString(), count: articles.length, articles }, null, 2),
    { headers: JSON_HEADERS }
  );
};
