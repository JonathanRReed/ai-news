import type { APIRoute } from "astro";
import { allArticles } from "../../lib/feeds.js";

export const GET: APIRoute = () => {
  const articles = allArticles().map(({ id, company, title, published_at }) => ({
    id,
    company,
    title,
    published_at,
  }));

  return new Response(JSON.stringify({ articles }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
