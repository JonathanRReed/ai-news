import { describe, expect, test } from 'bun:test';
import { toArticle } from './articleCompatibility.js';
import type { FeedItem } from '../types/intelligence.js';

describe('toArticle', () => {
  test('preserves a legacy route and first-party provenance', () => {
    const item = {
      id: '11111111-1111-5111-8111-111111111111',
      legacy_id: 'legacy-route',
      entity_name: 'Example Lab',
      title: 'Release',
      canonical_url: 'https://example.com/release',
      published_at: '2026-08-30T00:00:00.000Z',
      excerpt: 'Summary',
      content: 'Content',
      item_type: 'release',
      source_type: 'rss_official',
      source_url: 'https://example.com/feed.xml',
    } as FeedItem;

    expect(toArticle(item)).toEqual({
      id: 'legacy-route',
      company: 'Example Lab',
      title: 'Release',
      url: 'https://example.com/release',
      published_at: '2026-08-30T00:00:00.000Z',
      item_type: 'release',
      source_type: 'rss_official',
      summary: 'Summary',
      content: 'Content',
      source_url: 'https://example.com/feed.xml',
    });
  });
});
