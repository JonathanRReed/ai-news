import type { Article } from '../types/article.js';
import type { FeedItem } from '../types/intelligence.js';
import { truncateArticleExcerpt } from './articleExcerpt.js';

export function toArticle(item: FeedItem): Article {
  return {
    id: item.legacy_id || item.id,
    company: item.entity_name,
    title: item.title,
    url: item.canonical_url,
    published_at: item.published_at,
    source_type: item.source_type,
    summary: truncateArticleExcerpt(item.excerpt || item.content || ''),
    content: item.content ?? '',
    source_url: item.source_url,
    source_key: item.source_key,
  };
}
