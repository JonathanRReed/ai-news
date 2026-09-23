import type { Article } from '../types/article.js';
import type { FeedItem } from '../types/intelligence.js';
import { truncateArticleExcerpt } from './articleExcerpt.js';
import { decodePublisherPunctuation } from './publisherText.js';

export function toArticle(item: FeedItem): Article {
  const article: Article = {
    id: item.legacy_id || item.id,
    company: item.entity_name,
    title: decodePublisherPunctuation(item.title),
    url: item.canonical_url,
    published_at: item.published_at,
    source_type: item.source_type,
    summary: truncateArticleExcerpt(decodePublisherPunctuation(item.excerpt || item.content || '')),
    content: decodePublisherPunctuation(item.content ?? ''),
    source_url: item.source_url,
    source_key: item.source_key,
  };
  if (item.item_type) article.item_type = item.item_type;
  return article;
}
