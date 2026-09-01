import type { APIRoute } from "astro";
import providerArticles from "../../../public/data/provider-articles.json";
import { admittedArticles } from "../../lib/articleAdmission.js";
import { articleExcerpt } from "../../lib/articleExcerpt.js";
import type { Article } from "../../types/article.js";

export const GET: APIRoute = () => {
  const articles = admittedArticles(providerArticles as Article[]).map((article) => ({
    id: article.id,
    company: article.company,
    title: article.title,
    url: article.url,
    published_at: article.published_at,
    source_type: article.source_type,
    summary: articleExcerpt(article),
    source_url: article.source_url,
    source_key: article.source_key,
  }));

  return new Response(JSON.stringify(articles), {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
