import type { Article } from "../types/article.js";

function canRepresentLab(article: Article): boolean {
  // company is the admitted feed's entity, not a separate producer field.
  // Hugging Face's verified organization namespace is first-party; other
  // community namespaces keep their source label without producer credit.
  if (article.company !== "Hugging Face") return true;
  try {
    const url = new URL(article.url);
    return url.hostname === "huggingface.co"
      && /^\/blog\/(?:huggingface\/)?[^/]+\/?$/.test(url.pathname)
      && !/^\/blog\/huggingface\/?$/.test(url.pathname)
      && !/%(?:2f|5c)/i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Select cards from eligible releases, retaining input chronology and catalog order. */
export function latestModelReleasesPerLab(releases: Article[], labNames: string[]): Array<{ name: string; article: Article }> {
  return labNames.flatMap((name) => {
    const article = releases.find((entry) => entry.company === name && canRepresentLab(entry));
    return article ? [{ name, article }] : [];
  });
}
