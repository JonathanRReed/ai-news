import type { Article } from "../types/article.js";
import { isSourceBoilerplate } from "./sourceBoilerplate.mjs";

export const ARTICLE_EXCERPT_MAX_LENGTH = 500;

export function truncateArticleExcerpt(
  value: unknown,
  maxLength = ARTICLE_EXCERPT_MAX_LENGTH,
): string {
  // Publisher changelogs can include contributor addresses. Cloudflare turns
  // those into crawlable /cdn-cgi/l/email-protection links in public excerpts.
  const clean = typeof value === "string"
    ? value.replace(/<?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}>?/gi, "").replace(/\s+/g, " ").trim()
    : "";
  if (!clean || clean.length <= maxLength) return clean;
  if (!Number.isInteger(maxLength) || maxLength < 4) return "";

  const clipped = clean.slice(0, maxLength - 3);
  const lastSpace = clipped.lastIndexOf(" ");
  const minimumBoundary = Math.floor((maxLength - 3) * 0.6);
  const base = lastSpace >= minimumBoundary ? clipped.slice(0, lastSpace) : clipped;

  return `${base.trimEnd()}...`;
}

export function articleExcerpt(
  article: Pick<Article, "summary" | "content"> & Partial<Pick<Article, "source_key">>,
  maxLength = ARTICLE_EXCERPT_MAX_LENGTH,
): string {
  // Some publisher feeds expose only the first word of a page as its summary.
  // A fragment like "We" is not useful source context or a page description.
  for (const value of [article.summary, article.content]) {
    if (isSourceBoilerplate(article.source_key, value)) continue;
    const excerpt = truncateArticleExcerpt(value, maxLength);
    if (excerpt.length >= 20 && excerpt.toLowerCase() !== "no content.") return excerpt;
  }
  return "";
}
