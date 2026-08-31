import { describe, expect, test } from 'bun:test';
import { buildBackfill, verifyBackfill } from './backfill.mjs';

const sourceMap = new Map([
  ['Example Lab', {
    sourceKey: 'example-lab-news',
    entitySlug: 'example-lab',
    entityName: 'Example Lab',
    officialUrl: 'https://example.com/news',
    endpointUrl: 'https://example.com/feed.xml',
    sourceType: 'rss_official',
    itemType: 'announcement',
  }],
]);

function article(overrides) {
  return {
    id: 'base-id',
    company: 'Example Lab',
    title: 'Example item',
    url: 'https://example.com/news/base',
    published_at: '2026-08-30T00:00:00.000Z',
    source_type: 'rss_official',
    source_url: 'https://example.com/feed.xml',
    summary: 'Summary',
    content: 'Content',
    ...overrides,
  };
}

describe('buildBackfill', () => {
  test('preserves cache-only, live-only, duplicate, and legacy route records', () => {
    const cacheRows = [
      article({ id: 'cache-only', url: 'https://example.com/news/cache-only' }),
      article({ id: 'cache-duplicate', url: 'https://example.com/news/shared?utm_source=old' }),
    ];
    const legacyRows = [
      article({ id: 'live-only', url: 'https://example.com/news/live-only' }),
      article({
        id: 'live-duplicate',
        url: 'https://example.com/news/shared',
        title: 'Refreshed shared item',
      }),
      article({ id: 'invalid-url', url: 'javascript:alert(1)' }),
    ];

    const bundle = buildBackfill({
      legacyRows,
      cacheRows,
      sourceMap,
      now: '2026-08-30T12:00:00.000Z',
    });

    expect(bundle.contentItems).toHaveLength(3);
    expect(bundle.events).toHaveLength(3);
    expect(bundle.routeAliases.map(({ legacy_id }) => legacy_id).sort()).toEqual([
      'cache-duplicate',
      'cache-only',
      'live-duplicate',
      'live-only',
    ]);
    expect(bundle.quarantine).toEqual([
      expect.objectContaining({ id: 'invalid-url', reason: 'source URL is outside declared HTTPS hosts' }),
    ]);
    expect(bundle.contentItems.find(({ canonical_url }) => canonical_url.endsWith('/shared')).legacy_id)
      .toBe('cache-duplicate');
    expect(bundle.routeAliases.find(({ legacy_id }) => legacy_id === 'live-duplicate')?.destination_path)
      .toBe('/article/cache-duplicate');
    expect(bundle.receipt.unexplainedLossCount).toBe(0);
  });

  test('reports a legacy ID collision instead of silently remapping a route', () => {
    const bundle = buildBackfill({
      legacyRows: [article({ id: 'same-id', url: 'https://example.com/news/live' })],
      cacheRows: [article({ id: 'same-id', url: 'https://example.com/news/cache' })],
      sourceMap,
      now: '2026-08-30T12:00:00.000Z',
    });

    expect(bundle.receipt.legacyIdCollisionCount).toBe(1);
    expect(bundle.receipt.unexplainedLossCount).toBe(1);
  });

  test('quarantines an off-host legacy URL as explained rejection', () => {
    const bundle = buildBackfill({
      legacyRows: [article({ id: 'hostile', url: 'https://attacker.example/payload' })],
      cacheRows: [],
      sourceMap,
      now: '2026-08-30T12:00:00.000Z',
    });

    expect(bundle.contentItems).toEqual([]);
    expect(bundle.routeAliases).toEqual([]);
    expect(bundle.quarantine).toEqual([
      expect.objectContaining({ id: 'hostile', reason: 'source URL is outside declared HTTPS hosts' }),
    ]);
    expect(bundle.receipt.unexplainedLossCount).toBe(0);
  });
});

describe('verifyBackfill', () => {
  test('fails verification when a valid canonical URL or route is missing', () => {
    const result = verifyBackfill(
      {
        validCanonicalUrls: ['https://example.com/a', 'https://example.com/b'],
        routeIds: ['a', 'b'],
      },
      {
        contentItems: [{ canonical_url: 'https://example.com/a' }],
        routeAliases: [{ legacy_id: 'a' }],
      },
    );

    expect(result.ok).toBeFalse();
    expect(result.missingCanonicalUrls).toEqual(['https://example.com/b']);
    expect(result.missingRouteIds).toEqual(['b']);
  });
});
