import type { Article } from "../types/article.js";

export const ARTICLE_EXCERPT_MAX_LENGTH = 500;

export function truncateArticleExcerpt(
  value: unknown,
  maxLength = ARTICLE_EXCERPT_MAX_LENGTH,
): string {
  const clean = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!clean || clean.length <= maxLength) return clean;
  if (!Number.isInteger(maxLength) || maxLength < 4) return "";

  const clipped = clean.slice(0, maxLength - 3);
  const lastSpace = clipped.lastIndexOf(" ");
  const minimumBoundary = Math.floor((maxLength - 3) * 0.6);
  const base = lastSpace >= minimumBoundary ? clipped.slice(0, lastSpace) : clipped;

  return `${base.trimEnd()}...`;
}

export function articleExcerpt(
  article: Pick<Article, "summary" | "content">,
  maxLength = ARTICLE_EXCERPT_MAX_LENGTH,
): string {
  return truncateArticleExcerpt(article.summary || article.content || "", maxLength);
}
