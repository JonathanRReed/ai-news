import { mergeCanonicalItems } from './intelligence/normalize.mjs';
import { normalizeArticleRouteId } from '../src/lib/articleRoutes.ts';

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

export function mergeProviderArticles(gathered, existing, options = {}) {
  if (typeof options.admitArticle !== 'function') {
    throw new Error('mergeProviderArticles requires an article admission policy');
  }
  const toCanonical = (article) => ({
    ...article,
    legacy_id: normalizeArticleRouteId(article.id, 'article id'),
    canonical_url: articleKey(article),
  });
  const toArticle = (item) => {
    const article = { ...item };
    const legacyId = article.legacy_id;
    delete article.canonical_url;
    delete article.legacy_id;
    return { ...article, id: legacyId || article.id };
  };

  const validGathered = gathered.filter(isValidArticle).filter(options.admitArticle).map(toCanonical);
  const validExisting = existing.filter(isValidArticle).filter(options.admitArticle).map(toCanonical);
  return mergeCanonicalItems(validGathered, validExisting).map(toArticle);
}
