function articleKey(article) {
  return `${article.company}:${article.url}`;
}

function isValidArticle(article) {
  return Boolean(
    article &&
    typeof article.company === 'string' &&
    article.company &&
    typeof article.url === 'string' &&
    article.url &&
    typeof article.published_at === 'string' &&
    article.published_at
  );
}

function compareNewest(a, b) {
  return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
}

export function mergeProviderArticles(gathered, existing) {
  const merged = new Map();

  for (const article of [...gathered, ...existing]) {
    if (!isValidArticle(article)) continue;
    const key = articleKey(article);
    if (!merged.has(key)) merged.set(key, article);
  }

  return [...merged.values()].sort(compareNewest);
}
