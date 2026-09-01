import providerArticles from "../../public/data/provider-articles.json";
import { admittedArticles } from "./articleAdmission.js";
import { articleExcerpt } from "./articleExcerpt.js";
import type { Article } from "../types/article.js";

export const SITE_URL = "https://ai-news.helloworldfirm.com";

export function companySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeXml(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function allArticles(): Article[] {
  return admittedArticles(providerArticles as Article[])
    .slice()
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

interface RssOptions {
  title: string;
  description: string;
  feedPath: string;
  items: Article[];
  buildDate: string;
  limit?: number;
}

export function buildRss({ title, description, feedPath, items, buildDate, limit = 50 }: RssOptions): string {
  const entries = items
    .slice(0, limit)
    .map((article) => {
      const pub = new Date(article.published_at);
      const pubDate = Number.isNaN(pub.getTime()) ? buildDate : pub.toUTCString();
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <guid isPermaLink="false">${escapeXml(article.id)}</guid>
      <dc:creator>${escapeXml(article.company)}</dc:creator>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(articleExcerpt(article))}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}${feedPath}" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`;
}

export function buildJsonFeed({ title, description, feedPath, items, buildDate, limit = 50 }: RssOptions): string {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title,
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}${feedPath}`,
    description,
    date_modified: new Date(buildDate).toISOString(),
    items: items.slice(0, limit).map((article) => ({
      id: article.id,
      url: article.url,
      external_url: article.url,
      title: article.title,
      summary: articleExcerpt(article),
      date_published: article.published_at,
      authors: [{ name: article.company }],
      tags: [article.company],
      _ai_news_permalink: `${SITE_URL}/article/${article.id}/`,
    })),
  }, null, 2);
}

export const RSS_HEADERS = { "Content-Type": "application/rss+xml; charset=utf-8" };
export const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
