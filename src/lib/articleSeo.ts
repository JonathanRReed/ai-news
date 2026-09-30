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
  const title = cleanText(currentArticle.title).replace(/[.!?]+$/, "");
  if (currentExcerpt && !placeholderExcerpt) {
    const excerpt = cleanText(currentExcerpt);
    // Release feeds often repeat the same boilerplate across distinct versions.
    // Keep the publisher headline first without repeating it when already present.
    const description = excerpt.toLocaleLowerCase("en-US").startsWith(title.toLocaleLowerCase("en-US"))
      ? excerpt
      : `${title}. ${excerpt}`;
    return truncateAtWord(description, 155);
  }
  const sourceNote = `. Read the original at ${sourceDomain || "the publisher's site"}.`;
  return title.length + sourceNote.length <= 155
    ? `${title}${sourceNote}`
    : truncateAtWord(title, 155);
}

