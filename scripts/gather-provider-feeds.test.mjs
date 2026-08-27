import { describe, expect, test } from 'bun:test';
import { mergeProviderArticles } from './merge-provider-articles.mjs';

const cachedArticle = {
  id: 'cached-history',
  company: 'OpenAI',
  title: 'Cached history',
  url: 'https://example.com/history',
  published_at: '2026-08-20T00:00:00.000Z',
  source_type: 'rss_official',
  summary: 'Cached summary',
  content: 'Cached content',
  source_url: 'https://feeds.example.com/openai.xml',
};

const gatheredArticle = {
  ...cachedArticle,
  id: 'gathered-history',
  title: 'Refreshed history',
  summary: 'Refreshed summary',
  content: 'Refreshed content',
  published_at: '2026-08-27T00:00:00.000Z',
};

describe('mergeProviderArticles', () => {
  test('retains valid cached records missing from a successful feed window', () => {
    const currentArticle = {
      ...cachedArticle,
      id: 'current-article',
      url: 'https://example.com/current',
      title: 'Current article',
      published_at: '2026-08-26T00:00:00.000Z',
    };

    const merged = mergeProviderArticles([currentArticle], [cachedArticle]);

    expect(merged.map((article) => article.url)).toEqual([
      currentArticle.url,
      cachedArticle.url,
    ]);
  });

  test('prefers newly gathered metadata for duplicate company and URL keys', () => {
    const merged = mergeProviderArticles([gatheredArticle], [cachedArticle]);

    expect(merged).toEqual([gatheredArticle]);
  });
});
