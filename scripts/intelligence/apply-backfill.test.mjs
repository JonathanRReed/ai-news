import { describe, expect, test } from 'bun:test';
import { applyBackfill } from './apply-backfill.mjs';

const manifest = {
  entities: [{
    slug: 'example',
    name: 'Example',
    entityType: 'provider',
    status: 'active',
    homepageUrl: 'https://example.com',
    summary: '',
  }],
  sources: [{
    sourceKey: 'example-news',
    entitySlug: 'example',
    name: 'Example News',
    officialUrl: 'https://example.com/news',
    endpointUrl: 'https://example.com/feed.xml',
    transportType: 'rss',
    sourceRole: 'newsroom',
    parserKey: 'rss',
    active: true,
    required: false,
    verifiedAt: '2026-08-30',
    includePaths: [],
  }],
};

const bundle = {
  contentItems: [{ id: 'item' }],
  contentItemEntities: [{ content_item_id: 'item' }],
  events: [{ id: 'event' }],
  eventItems: [{ event_id: 'event' }],
  eventEntities: [{ event_id: 'event' }],
  routeAliases: [{ legacy_id: 'legacy' }],
  receipt: { unexplainedLossCount: 0 },
};

describe('applyBackfill', () => {
  test('upserts the lossless bundle in referential order without deletes', async () => {
    const calls = [];
    const client = {
      async selectRows() { return []; },
      async upsertRows(table, rows, options) { calls.push({ table, rows, options }); },
    };

    const result = await applyBackfill({ bundle, manifest, client });

    expect(calls.map(({ table }) => table)).toEqual([
      'entities',
      'sources',
      'content_items',
      'content_item_entities',
      'events',
      'event_items',
      'event_entities',
      'route_aliases',
    ]);
    expect(result).toMatchObject({ contentItems: 1, routeAliases: 1, events: 1 });
    expect('deleteRows' in client).toBeFalse();
  });

  test('refuses a bundle with unexplained loss', async () => {
    await expect(applyBackfill({
      bundle: { ...bundle, receipt: { unexplainedLossCount: 1 } },
      manifest,
      client: { async upsertRows() {} },
    })).rejects.toThrow('unexplained loss');
  });

  test('preserves imported immutable identity fields and remaps dependent rows', async () => {
    const importedItem = {
      id: 'legacy-item-id',
      legacy_id: 'legacy-route-id',
      source_id: 'source-id',
      canonical_url: 'https://example.com/news/shared',
      published_at: '2026-08-29T00:00:00.000Z',
      first_seen_at: '2026-08-29T01:00:00.000Z',
    };
    const importedBundle = {
      contentItems: [{
        id: 'canonical-item-id',
        legacy_id: 'cache-route-id',
        source_id: 'replacement-source-id',
        canonical_url: importedItem.canonical_url,
        published_at: '2026-08-29T02:00:00.000Z',
        first_seen_at: '2026-08-30T00:00:00.000Z',
        last_seen_at: '2026-08-31T00:00:00.000Z',
      }],
      contentItemEntities: [{
        content_item_id: 'canonical-item-id',
        entity_id: 'entity-id',
        role: 'publisher',
      }],
      events: [{ id: 'event-id', anchor_item_id: 'canonical-item-id' }],
      eventItems: [{
        event_id: 'event-id',
        content_item_id: 'canonical-item-id',
        role: 'anchor',
      }],
      eventEntities: [{ event_id: 'event-id', entity_id: 'entity-id', role: 'publisher' }],
      routeAliases: [{
        legacy_id: 'cache-route-id',
        content_item_id: 'canonical-item-id',
        destination_path: '/article/cache-route-id',
      }],
      receipt: { unexplainedLossCount: 0 },
    };
    const calls = [];
    const client = {
      async selectRows(table) {
        expect(table).toBe('content_items');
        return [importedItem];
      },
      async upsertRows(table, rows, options) { calls.push({ table, rows, options }); },
    };

    await applyBackfill({ bundle: importedBundle, manifest, client });

    const rowsFor = (table) => calls.find((call) => call.table === table).rows;
    expect(rowsFor('content_items')[0]).toMatchObject(importedItem);
    expect(rowsFor('content_item_entities')[0].content_item_id).toBe('legacy-item-id');
    expect(rowsFor('events')[0].anchor_item_id).toBe('legacy-item-id');
    expect(rowsFor('event_items')[0].content_item_id).toBe('legacy-item-id');
    expect(rowsFor('route_aliases')[0].content_item_id).toBe('legacy-item-id');
    expect(rowsFor('route_aliases')[0].destination_path).toBe('/article/legacy-route-id');
  });
});
