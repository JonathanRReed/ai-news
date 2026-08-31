import { describe, expect, test } from 'bun:test';
import {
  compareCanonicalItems,
  mergeCanonicalItems,
  normalizeItem,
  normalizeUrl,
  stableItemId,
  toLegacyArticle,
} from './normalize.mjs';

const source = {
  sourceKey: 'openai-news',
  entitySlug: 'openai',
  entityName: 'OpenAI',
  sourceType: 'rss_official',
  endpointUrl: 'https://openai.com/news/rss.xml',
};

function rawItem(overrides = {}) {
  return {
    id: 'legacy-openai-release',
    title: 'A model release',
    url: 'https://openai.com/index/model-release/?utm_source=newsletter#details',
    published_at: '2026-08-20T12:00:00.000Z',
    summary: 'A source-provided summary.',
    content: 'A source-provided summary with more detail.',
    ...overrides,
  };
}

describe('normalizeUrl', () => {
  test('removes fragments and tracking parameters while sorting retained query parameters', () => {
    expect(
      normalizeUrl(' HTTPS://Example.COM/news/?z=2&utm_medium=email&a=1&fbclid=abc#section '),
    ).toBe('https://example.com/news/?a=1&z=2');
  });

  test('rejects non-web protocols', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow('HTTP or HTTPS');
  });
});

describe('stableItemId', () => {
  test('is deterministic and source-scoped', () => {
    const url = 'https://example.com/release';
    expect(stableItemId('source-a', url)).toBe(stableItemId('source-a', url));
    expect(stableItemId('source-a', url)).not.toBe(stableItemId('source-b', url));
  });
});

describe('normalizeItem', () => {
  test('creates a canonical record and retains the legacy route id', () => {
    const item = normalizeItem(rawItem(), source, { now: '2026-08-30T00:00:00.000Z' });

    expect(item).toMatchObject({
      legacy_id: 'legacy-openai-release',
      source_key: 'openai-news',
      entity_slug: 'openai',
      entity_name: 'OpenAI',
      canonical_url: 'https://openai.com/index/model-release/',
      published_at: '2026-08-20T12:00:00.000Z',
      first_seen_at: '2026-08-30T00:00:00.000Z',
      last_seen_at: '2026-08-30T00:00:00.000Z',
    });
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(item.content_hash).toHaveLength(64);
  });

  test('rejects an invalid publication date instead of inventing one', () => {
    expect(() => normalizeItem(rawItem({ published_at: 'not-a-date' }), source)).toThrow(
      'valid publication date',
    );
  });

  test('requires canonical URLs to use a source-admitted HTTPS host', () => {
    expect(() => normalizeItem(rawItem({ url: 'https://attacker.example/payload' }), source))
      .toThrow('source URL is outside declared HTTPS hosts');
    expect(() => normalizeItem(rawItem({ url: 'http://openai.com/model-release' }), source))
      .toThrow('source URL is outside declared HTTPS hosts');
    expect(normalizeItem(
      rawItem({ url: 'https://releases.openai.example/model-release' }),
      { ...source, allowedHosts: ['releases.openai.example'] },
    ).canonical_url).toBe('https://releases.openai.example/model-release');
  });
});

describe('mergeCanonicalItems', () => {
  test('preserves immutable identity when a source refreshes metadata', () => {
    const historical = normalizeItem(rawItem(), source, { now: '2026-08-21T00:00:00.000Z' });
    const refreshed = normalizeItem(
      rawItem({
        id: 'changed-route-id',
        title: 'A corrected model release',
        summary: 'Corrected publisher summary.',
        published_at: '2026-08-29T00:00:00.000Z',
      }),
      source,
      { now: '2026-08-30T00:00:00.000Z' },
    );

    const [merged] = mergeCanonicalItems([refreshed], [historical]);

    expect(merged.id).toBe(historical.id);
    expect(merged.legacy_id).toBe(historical.legacy_id);
    expect(merged.published_at).toBe(historical.published_at);
    expect(merged.first_seen_at).toBe(historical.first_seen_at);
    expect(merged.title).toBe(refreshed.title);
    expect(merged.summary).toBe(refreshed.summary);
    expect(merged.last_seen_at).toBe(refreshed.last_seen_at);
  });

  test('orders equal timestamps by stable id descending', () => {
    const itemA = { id: 'news-a', canonical_url: 'https://example.com/a', published_at: '2026-08-20T00:00:00.000Z' };
    const itemB = { id: 'news-b', canonical_url: 'https://example.com/b', published_at: '2026-08-20T00:00:00.000Z' };

    const merged = mergeCanonicalItems([itemA, itemB], []);

    expect(merged.map(({ id }) => id)).toEqual(['news-b', 'news-a']);
    expect(compareCanonicalItems(itemA, itemB)).toBeGreaterThan(0);
  });
});

describe('toLegacyArticle', () => {
  test('keeps the permanent legacy route and source provenance', () => {
    const item = normalizeItem(rawItem(), source, { now: '2026-08-30T00:00:00.000Z' });

    expect(toLegacyArticle(item)).toEqual({
      id: 'legacy-openai-release',
      company: 'OpenAI',
      title: 'A model release',
      url: 'https://openai.com/index/model-release/',
      published_at: '2026-08-20T12:00:00.000Z',
      source_type: 'rss_official',
      summary: 'A source-provided summary.',
      content: 'A source-provided summary with more detail.',
      source_url: 'https://openai.com/news/rss.xml',
    });
  });
});
