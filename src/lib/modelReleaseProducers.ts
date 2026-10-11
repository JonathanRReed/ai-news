import type { Article } from "../types/article.js";

function canRepresentLab(article: Article): boolean {
  // company is the admitted feed's entity, not a separate producer field.
  // Hugging Face community URLs identify another author/organization. Keep
  // their source label in the timeline without crediting the host as producer.
  if (article.company !== "Hugging Face") return true;
  try {
    const url = new URL(article.url);
    return url.hostname === "huggingface.co" && /^\/blog\/[^/]+\/?$/.test(url.pathname);
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
