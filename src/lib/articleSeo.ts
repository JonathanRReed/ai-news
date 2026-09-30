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
  const excerpt = cleanText(currentExcerpt);
  const placeholderExcerpt = excerpt.toLowerCase() === "no content.";
  const title = cleanText(currentArticle.title).replace(/[.!?]+$/, "");
  if (excerpt && !placeholderExcerpt) {
    const beginsWithTitle = title.length > 0
      && excerpt.toLocaleLowerCase("en-US").startsWith(title.toLocaleLowerCase("en-US"))
      && (excerpt.length === title.length || /^[\s:;,.!?—–-]/u.test(excerpt.slice(title.length)));
    if (beginsWithTitle && title.length <= 70) return truncateAtWord(excerpt, 155);

    const summary = beginsWithTitle
      ? excerpt.slice(title.length).replace(/^[\s:;,.!?—–-]+/u, "")
      : excerpt;
    if (!summary) return truncateAtWord(excerpt, 155);

    // Keep the real headline identifiable while reserving room for source context.
    const headline = truncateAtWord(title, 70);
    const description = headline
      ? `${headline}${headline.endsWith("...") ? " " : ". "}${summary}`
      : summary;
    return truncateAtWord(description, 155);
  }
  const sourceNote = `. Read the original at ${sourceDomain || "the publisher's site"}.`;
  return title.length + sourceNote.length <= 155
    ? `${title}${sourceNote}`
    : truncateAtWord(title, 155);
}

