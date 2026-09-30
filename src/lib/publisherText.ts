const publisherEntities: Record<string, string> = {
  mdash: "—",
  nbsp: " ",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
};

// Some feeds expose these HTML entities as literal text in titles and excerpts.
export function decodePublisherPunctuation(text: string): string {
  return text.replace(/&(mdash|nbsp|rsquo|ldquo|rdquo|hellip);/gi, (match, entity: string) =>
    publisherEntities[entity.toLowerCase()] ?? match);
}

/** Keep package versions copyable without exposing an email-like text node. */
export function publisherTextParts(text: string): string[] {
  return text.split(/(?<=@)(?=\d+(?:\.\d+)+)/g);
}
