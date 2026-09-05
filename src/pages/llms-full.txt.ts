import type { APIRoute } from "astro";
import { allArticles, SITE_URL } from "../lib/feeds.js";
import { articleExcerpt } from "../lib/articleExcerpt.js";
import { deriveTopics } from "../lib/articleTags.js";
import { activeEntities, entitySharePath, entityTypeLabel } from "../lib/intelligenceCatalog.js";
import { majorUpdates } from "../lib/majorUpdates.js";
import { dailyDigests } from "../lib/dailyDigest.js";

const ARTICLE_LIMIT = 400;
const MAJOR_LIMIT = 60;

/**
 * Long-form companion to /llms.txt. Every line comes from the same verified
 * cache the pages render, so an assistant quoting this file quotes what a
 * visitor sees: official titles, dates, and source URLs, never a rewrite.
 */
const day = (iso: string): string => iso.slice(0, 10);
const clean = (value: string): string => value.replace(/\s+/g, " ").trim();

export const GET: APIRoute = () => {
  const articles = allArticles();
  const latest = articles.slice(0, ARTICLE_LIMIT);
  const major = majorUpdates(articles).slice(0, MAJOR_LIMIT);
  const digests = dailyDigests(articles).slice(0, 30);
  const newest = articles[0]?.published_at ? day(articles[0].published_at) : "unknown";
  const oldest = articles.at(-1)?.published_at ? day(articles.at(-1)!.published_at) : "unknown";

  const head = [
    "# AI News, full listing",
    "",
    `> Official announcements from AI labs, model providers, research organizations, and agent harnesses, kept with the publisher's own title, date, and URL. ${articles.length} records from ${oldest} to ${newest}. Generated at build from the same verified cache the site renders.`,
    "",
    "How to read this file:",
    "- Every item is a first-party source. The title is the publisher's title. The URL is the original post. The excerpt is quoted from the source, not rewritten.",
    "- Dates are the publisher's publication date in UTC.",
    "- Major Updates are promoted by a published headline rule (named model releases and major harness versions), not by an editorial score.",
    "- Each item has a permanent page on this site; cite that page or the original URL.",
    "- Entity pages collect one organization or harness. Search with ?q= on the home page. ?model=<name> preselects a model name.",
    "",
    `Site: ${SITE_URL}/`,
    `Short guide: ${SITE_URL}/llms.txt`,
    `JSON feed: ${SITE_URL}/articles.json`,
    `RSS: ${SITE_URL}/feed.xml`,
    `Sitemap index: ${SITE_URL}/sitemap-index.xml`,
    "",
    "Usage policy: search indexing allowed, AI answers with a link back allowed, AI training not allowed. Matches the content signals in /robots.txt.",
    "",
    `## Tracked entities (${activeEntities.length})`,
    "",
    ...activeEntities.map((entity) => `- ${entity.name} (${entityTypeLabel(entity.entityType)}): ${SITE_URL}${entitySharePath(entity)} · ${clean(entity.summary)}`),
    "",
    `## Major updates (latest ${major.length})`,
    "",
    ...major.map(({ article, reason }) =>
      `- ${day(article.published_at)} · ${article.company} · ${clean(article.title)} · ${SITE_URL}/article/${article.id}/ · source ${article.url} · rule: ${reason}`),
    "",
    `## Daily digests (latest ${digests.length})`,
    "",
    ...digests.map((digest) => `- ${digest.day}: ${digest.count} items, ${digest.majorCount} major · ${SITE_URL}/digest/daily/${digest.day}/`),
    "",
    `## Latest ${latest.length} records`,
    "",
  ];

  const body = latest.map((article) => {
    const topics = deriveTopics(article);
    return [
      `### ${clean(article.title)}`,
      `- Published: ${day(article.published_at)}`,
      `- Source: ${article.company} (${article.source_type})`,
      `- Original: ${article.url}`,
      `- Page: ${SITE_URL}/article/${article.id}/`,
      ...(topics.length ? [`- Topics: ${topics.join(", ")}`] : []),
      `- Excerpt: ${clean(articleExcerpt(article))}`,
      "",
    ].join("\n");
  });

  return new Response(`${head.join("\n")}${body.join("\n")}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
};
