import { describe, expect, test } from 'bun:test';
import {
  collectLegacyArticles,
  collectRouteAliases,
  exportLegacyArticles,
  serializeLegacyArticles,
} from './export-cache.mjs';

const rows = [
  {
    id: '11111111-1111-5111-8111-111111111111',
    legacy_id: 'legacy-a',
    entity_name: 'Example Lab',
    title: 'Newest',
    canonical_url: 'https://example.com/newest',
    published_at: '2026-08-30T12:00:00.000Z',
    excerpt: 'Newest summary',
    content: null,
    source_url: 'https://example.com/feed.xml',
    source_key: 'example-news',
  },
  {
    id: '22222222-2222-5222-8222-222222222222',
    legacy_id: null,
    entity_name: 'Example Lab',
    title: 'Middle',
    canonical_url: 'https://example.com/middle',
    published_at: '2026-08-30T11:00:00.000Z',
    excerpt: null,
    content: null,
    source_url: 'https://example.com/feed.xml',
    source_key: 'example-news',
  },
  {
    id: '33333333-3333-5333-8333-333333333333',
    legacy_id: 'legacy-c',
    entity_name: 'Example Lab',
    title: 'Oldest',
    canonical_url: 'https://example.com/oldest',
    published_at: '2026-08-30T10:00:00.000Z',
    excerpt: null,
    content: null,
    source_url: 'https://example.com/feed.xml',
    source_key: 'example-news',
  },
];

const manifestSources = [{
  sourceKey: 'example-news',
  officialUrl: 'https://example.com/news',
  endpointUrl: 'https://example.com/feed.xml',
  allowedHosts: [],
}];

describe('exportLegacyArticles', () => {
  test('uses keyset pagination and emits every row once', async () => {
    const queries = [];
    const client = {
      async selectRows(_view, query) {
        queries.push(query);
        if (!query.or) return rows.slice(0, 2);
        return rows.slice(2);
      },
    };

    const pages = [];
    for await (const page of exportLegacyArticles({ client, pageSize: 2, manifestSources })) {
      pages.push(page);
    }

    expect(pages.flat().map(({ id }) => id)).toEqual([
      'legacy-a',
      rows[1].id,
      'legacy-c',
    ]);
    expect(pages.flat().every(({ source_key: sourceKey }) => sourceKey === 'example-news')).toBeTrue();
    expect(queries[1].or).toContain('published_at.lt.2026-08-30T11:00:00.000Z');
    expect(queries[1].or).toContain(`id.lt.${rows[1].id}`);
  });

  test('produces byte-identical deterministic exports', async () => {
    const client = { async selectRows() { return rows; } };
    const first = await collectLegacyArticles({ client, pageSize: 10, manifestSources });
    const second = await collectLegacyArticles({ client, pageSize: 10, manifestSources });
    expect(serializeLegacyArticles(first)).toBe(serializeLegacyArticles(second));
  });

  test('refuses to publish a canonical URL outside its source policy', async () => {
    const client = {
      async selectRows() {
        return [{ ...rows[0], canonical_url: 'https://attacker.example/payload' }];
      },
    };
    await expect(collectLegacyArticles({ client, pageSize: 10, manifestSources }))
      .rejects.toThrow('source URL is outside declared HTTPS hosts');
  });

  test('exports route aliases with keyset pagination', async () => {
    const client = {
      async selectRows(_view, query) {
        if (!query.legacy_id) {
          return [
            { legacy_id: 'a', destination_path: '/article/a' },
            { legacy_id: 'b', destination_path: '/article/b' },
          ];
        }
        return [{ legacy_id: 'c', destination_path: '/article/c' }];
      },
    };

    const aliases = await collectRouteAliases({ client, pageSize: 2 });
    expect(aliases.map(({ legacy_id }) => legacy_id)).toEqual(['a', 'b', 'c']);
  });
});
