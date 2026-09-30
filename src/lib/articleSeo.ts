import type { Article } from "../types/article.js";

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncateAtWord(text: string, maxLength: number): string {
  const clean = cleanText(text);
  if (clean.length <= maxLength) return clean;

  const clipped = clean.slice(0, Math.max(0, maxLength - 3));
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trim()}...`;
}

export function articleMetaDescription(currentArticle: Pick<Article, "title">, currentExcerpt: string, sourceDomain: string): string {
  const placeholderExcerpt = currentExcerpt.toLowerCase() === "no content.";
  if (currentExcerpt && !placeholderExcerpt) return truncateAtWord(currentExcerpt, 155);

  const title = cleanText(currentArticle.title).replace(/[.!?]+$/, "");
  const sourceNote = `. Read the original at ${sourceDomain || "the publisher's site"}.`;
  return title.length + sourceNote.length <= 155
    ? `${title}${sourceNote}`
    : truncateAtWord(title, 155);
}

