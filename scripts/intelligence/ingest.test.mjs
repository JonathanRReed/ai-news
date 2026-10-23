import { describe, expect, test } from 'bun:test';
import { manifestRows, runIngestion } from './ingest.mjs';

const manifest = {
  entities: [
    {
      slug: 'example-lab',
      name: 'Example Lab',
      entityType: 'lab',
      status: 'active',
      homepageUrl: 'https://example.com',
      summary: '',
    },
    {
      slug: 'example-harness',
      name: 'Example Harness',
      entityType: 'harness',
      status: 'active',
      homepageUrl: 'https://harness.example.com',
      summary: '',
    },
  ],
  sources: [
    {
      sourceKey: 'example-lab-news',
      entitySlug: 'example-lab',
      name: 'Example Lab News',
      officialUrl: 'https://example.com/news',
      endpointUrl: 'https://example.com/feed.xml',
      transportType: 'rss',
      sourceRole: 'newsroom',
      parserKey: 'rss',
      sourceType: 'rss_official',
      itemType: 'announcement',
      active: true,
      required: true,
      verifiedAt: '2026-08-30',
    },
    {
      sourceKey: 'example-harness-releases',
      entitySlug: 'example-harness',
      name: 'Example Harness Releases',
      officialUrl: 'https://harness.example.com',
      endpointUrl: 'https://harness.example.com/releases.atom',
      transportType: 'atom',
      sourceRole: 'releases',
      parserKey: 'atom',
      sourceType: 'rss_official',
      itemType: 'harness_release',
      active: true,
      required: false,
      verifiedAt: '2026-08-30',
    },
  ],
};

function fakeClient({ existingContentItems = [], existingSources = [] } = {}) {
  const calls = { upserts: [], patches: [], rpcs: [], deletes: [] };
  return {
    calls,
    async selectRows(table) {
      if (table === 'content_items') return existingContentItems;
      if (table === 'sources') return existingSources;
      return [];
    },
    async upsertRows(table, rows, options) {
      calls.upserts.push({ table, rows, options });
    },
    async patchRows(table, filters, values) {
      calls.patches.push({ table, filters, values });
    },
    async rpc(name, body) {
      calls.rpcs.push({ name, body });
      if (name === 'start_intelligence_ingestion') return '11111111-1111-4111-8111-111111111111';
      return null;
    },
  };
}

const validItem = {
  title: 'A useful release',
  url: 'https://example.com/news/useful-release',
  published_at: '2026-08-30T12:00:00.000Z',
  summary: 'What changed.',
  content: 'Release details.',
};

describe('runIngestion', () => {
  test('records optional source failure as partial without deleting history', async () => {
    const client = fakeClient();
    const receipt = await runIngestion({
      manifest,
      client,
      now: '2026-08-30T13:00:00.000Z',
      fetchSourceImpl: async (source) => (
        source.required
          ? {
            status: 'success',
            items: [validItem],
            httpStatus: 200,
            fetchedAt: '2026-08-30T13:00:00.000Z',
            etag: '"fresh"',
            lastModified: null,
            error: null,
          }
          : {
            status: 'failed',
            items: [],
            httpStatus: 503,
            fetchedAt: '2026-08-30T13:00:00.000Z',
            etag: null,
            lastModified: null,
            error: 'HTTP 503',
          }
      ),
    });

    expect(receipt.status).toBe('partial');
    expect(receipt.counts).toMatchObject({ succeeded: 1, failed: 1, items: 1 });
    expect(client.calls.deletes).toEqual([]);
    expect(client.calls.upserts.find(({ table }) => table === 'content_items').rows).toHaveLength(1);
    expect(client.calls.rpcs.at(-1).name).toBe('finish_intelligence_ingestion');
  });

  test('fails the overall run when a required source fails', async () => {
    const client = fakeClient();
    const receipt = await runIngestion({
      manifest: { ...manifest, sources: [manifest.sources[0]] },
      client,
      now: '2026-08-30T13:00:00.000Z',
      fetchSourceImpl: async () => ({
        status: 'failed',
        items: [],
        httpStatus: 429,
        fetchedAt: '2026-08-30T13:00:00.000Z',
        etag: null,
        lastModified: null,
        error: 'HTTP 429',
      }),
    });

    expect(receipt.status).toBe('failed');
    expect(receipt.requiredFailures).toEqual(['example-lab-news']);
    expect(client.calls.upserts.some(({ table }) => table === 'content_items')).toBeFalse();
  });

  test('preserves imported immutable identity fields when refreshing a canonical URL', async () => {
    const { sourceRows } = manifestRows(manifest);
    const importedItem = {
      id: 'legacy-item-id',
      legacy_id: 'legacy-route-id',
      source_id: sourceRows[0].id,
      canonical_url: validItem.url,
      published_at: '2026-08-29T12:00:00.000Z',
      first_seen_at: '2026-08-29T13:00:00.000Z',
    };
    const client = fakeClient({ existingContentItems: [importedItem] });

    await runIngestion({
      manifest: { ...manifest, sources: [manifest.sources[0]] },
      client,
      now: '2026-08-30T13:00:00.000Z',
      clock: () => '2026-08-30T13:00:01.000Z',
      fetchSourceImpl: async () => ({
        status: 'success',
        items: [validItem],
        httpStatus: 200,
        fetchedAt: '2026-08-30T13:00:00.000Z',
        etag: null,
        lastModified: null,
        error: null,
      }),
    });

    const itemRows = client.calls.upserts.find(({ table }) => table === 'content_items').rows;
    expect(itemRows[0]).toMatchObject(importedItem);
    expect(client.calls.upserts.find(({ table }) => table === 'content_item_entities').rows[0]
      .content_item_id).toBe('legacy-item-id');
    const eventRow = client.calls.upserts.find(({ table }) => table === 'events').rows[0];
    expect(eventRow.anchor_item_id).toBe('legacy-item-id');
    expect(eventRow.id).toBe('732fbed4-8eaa-5e54-8a03-70350d562464');
    expect(client.calls.upserts.find(({ table }) => table === 'event_items').rows[0]).toMatchObject({
      event_id: '732fbed4-8eaa-5e54-8a03-70350d562464',
      content_item_id: 'legacy-item-id',
    });
  });

  test('finishes a run with a fresh completion timestamp', async () => {
    const client = fakeClient();

    await runIngestion({
      manifest: { ...manifest, sources: [manifest.sources[0]] },
      client,
      now: '2026-08-30T13:00:00.000Z',
      clock: () => '2026-08-30T13:00:01.000Z',
      fetchSourceImpl: async () => ({
        status: 'failed',
        items: [],
        httpStatus: 503,
        fetchedAt: '2026-08-30T13:00:00.000Z',
        etag: null,
        lastModified: null,
        error: 'HTTP 503',
      }),
    });

    expect(client.calls.rpcs.at(-1)).toMatchObject({
      name: 'finish_intelligence_ingestion',
      body: { p_completed_at: '2026-08-30T13:00:01.000Z' },
    });
  });

  test('deduplicates repeated canonical URLs before writing a source batch', async () => {
    const client = fakeClient();

    const receipt = await runIngestion({
      manifest: { ...manifest, sources: [manifest.sources[0]] },
      client,
      now: '2026-08-30T13:00:00.000Z',
      clock: () => '2026-08-30T13:00:01.000Z',
      fetchSourceImpl: async () => ({
        status: 'success',
        items: [validItem, { ...validItem }],
        httpStatus: 200,
        fetchedAt: '2026-08-30T13:00:00.000Z',
        etag: null,
        lastModified: null,
        error: null,
      }),
    });

    expect(client.calls.upserts.find(({ table }) => table === 'content_items').rows).toHaveLength(1);
    expect(receipt.counts.items).toBe(1);
  });

  test('records a not-modified response as a successful health check', async () => {
    const { sourceRows } = manifestRows(manifest);
    const client = fakeClient({
      existingSources: [{
        id: sourceRows[0].id,
        source_key: manifest.sources[0].sourceKey,
        etag: '"existing"',
        last_modified: null,
        consecutive_failures: 0,
        last_success_at: null,
        last_item_at: '2026-08-29T12:00:00.000Z',
      }],
    });

    await runIngestion({
      manifest: { ...manifest, sources: [manifest.sources[0]] },
      client,
      now: '2026-08-30T13:00:00.000Z',
      clock: () => '2026-08-30T13:00:01.000Z',
      fetchSourceImpl: async () => ({
        status: 'not_modified',
        items: [],
        httpStatus: 304,
        fetchedAt: '2026-08-30T13:00:00.000Z',
        etag: '"existing"',
        lastModified: null,
        error: null,
      }),
    });

    expect(client.calls.patches[0].values).toMatchObject({
      last_success_at: '2026-08-30T13:00:00.000Z',
      last_item_at: '2026-08-29T12:00:00.000Z',
      consecutive_failures: 0,
    });
  });
});

describe('manifestRows', () => {
  test('persists source provenance for public projections', () => {
    const { sourceRows } = manifestRows(manifest);
    expect(sourceRows.map(({ metadata }) => metadata.source_type)).toEqual([
      'rss_official',
      'rss_official',
    ]);
    expect(sourceRows.map(({ metadata }) => metadata.item_type)).toEqual([
      'announcement',
      'harness_release',
    ]);
  });
});

test('publisher date corrections never mutate database identity on refresh', async () => {
  const { entities, sources } = await import('../../config/intelligence-sources.mjs');
  const source = sources.find(item => item.sourceKey === 'cohere-sitemap');
  const scoped = { entities, sources: [source] };
  const { sourceRows } = manifestRows(scoped);
  const existing = { id: 'e4fb6b08-0233-54a1-8c6e-6cfb429c0299', legacy_id: null, source_id: sourceRows[0].id, canonical_url: 'https://cohere.com/blog/ai-in-oil-and-gas', published_at: '2026-09-30T00:00:00Z', first_seen_at: '2026-09-30T00:00:00Z' };
  const client = fakeClient({ existingContentItems: [existing] });
  await runIngestion({ manifest: scoped, client, now: '2026-10-16T00:00:00Z', fetchSourceImpl: async () => ({ status: 'success', httpStatus: 200, fetchedAt: '2026-10-16T00:00:00Z', items: [{ ...validItem, url: existing.canonical_url, published_at: '2025-01-29T15:38:00Z' }] }) });
  expect(client.calls.upserts.find(call => call.table === 'content_items').rows[0].published_at).toBe(existing.published_at);
});

describe('source-scoped publisher identity', () => {
  const scoped = { ...manifest, sources: [manifest.sources[0]] };
  const { sourceRows } = manifestRows(scoped);
  const historical = {
    id: 'historical-id', legacy_id: 'historical-route', source_id: sourceRows[0].id,
    external_id: 'publisher-guid', canonical_url: validItem.url,
    published_at: '2026-08-29T12:00:00.000Z', first_seen_at: '2026-08-29T13:00:00.000Z',
  };
  const ingest = (client, items) => runIngestion({
    manifest: scoped, client, now: '2026-08-30T13:00:00.000Z',
    fetchSourceImpl: async () => ({status: 'success', items, httpStatus: 200}),
  });

  test('a stable publisher GUID preserves history when its feed URL changes', async () => {
    const client = fakeClient({ existingContentItems: [historical] });
    const receipt = await ingest(client, [{ ...validItem, url: `${validItem.url}-updated`, external_id: 'publisher-guid' }]);
    expect(receipt.status).toBe('success');
    const rows = client.calls.upserts.find(({table}) => table === 'content_items').rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(historical);
    const originalClient = fakeClient({ existingContentItems: [historical] });
    await ingest(originalClient, [{ ...validItem, external_id: 'publisher-guid' }]);
    expect(client.calls.upserts.find(({table}) => table === 'events').rows[0].id)
      .toBe(originalClient.calls.upserts.find(({table}) => table === 'events').rows[0].id);
  });

  test('conflicting URL and GUID matches fail before content writes', async () => {
    const client = fakeClient({ existingContentItems: [historical, {
      ...historical, id: 'other-id', canonical_url: `${validItem.url}-other`, external_id: 'other-guid',
    }] });
    const receipt = await ingest(client, [{ ...validItem, external_id: 'other-guid' }]);
    expect(receipt.status).toBe('failed');
    expect(receipt.sources[0].error).toBe('conflicting source item identities');
    expect(client.calls.upserts.some(({table}) => table === 'content_items')).toBeFalse();
  });

  test('same GUID on different sources does not merge unrelated articles', async () => {
    const client = fakeClient({ existingContentItems: [{ ...historical, source_id: 'different-source' }] });
    await ingest(client, [{ ...validItem, url: `${validItem.url}-new`, external_id: 'publisher-guid' }]);
    const row = client.calls.upserts.find(({table}) => table === 'content_items').rows[0];
    expect(row.id).not.toBe(historical.id);
    expect(row.source_id).toBe(sourceRows[0].id);
  });

  test('cross-source canonical matches retain the stored owner and external ID', async () => {
    const existing = { ...historical, source_id: 'different-source', external_id: 'owner-guid' };
    const client = fakeClient({ existingContentItems: [existing] });
    await ingest(client, [{ ...validItem, external_id: 'incoming-guid' }]);
    expect(client.calls.upserts.find(({table}) => table === 'content_items').rows[0]).toMatchObject(existing);
  });

  test('one batch cannot assign a new GUID to two different canonical URLs', async () => {
    const client = fakeClient();
    const receipt = await ingest(client, [
      { ...validItem, external_id: 'reused-guid' },
      { ...validItem, url: `${validItem.url}-other`, external_id: 'reused-guid' },
    ]);
    expect(receipt.status).toBe('failed');
    expect(client.calls.upserts.some(({table}) => table === 'content_items')).toBeFalse();
  });
});

test('failed normalization or writes retain the last successful cache validators', async () => {
  const { sourceRows } = manifestRows(manifest);
  const client = fakeClient({ existingSources: [{
    id: sourceRows[0].id, source_key: manifest.sources[0].sourceKey,
    etag: '"accepted"', last_modified: 'previous-date',
  }] });
  await runIngestion({
    manifest: { ...manifest, sources: [manifest.sources[0]] }, client,
    fetchSourceImpl: async () => ({ status: 'success', httpStatus: 200,
      items: [{ ...validItem, published_at: 'invalid' }], etag: '"rejected"', lastModified: 'new-date' }),
  });
  expect(client.calls.patches[0].values).toMatchObject({etag: '"accepted"', last_modified: 'previous-date'});
});

test('conflicting GUID claims for one URL are not hidden by URL deduplication', async () => {
  const client = fakeClient();
  const receipt = await runIngestion({
    manifest: { ...manifest, sources: [manifest.sources[0]] }, client,
    fetchSourceImpl: async () => ({ status: 'success', httpStatus: 200,
      items: [{ ...validItem, external_id: 'one' }, { ...validItem, external_id: 'two' }] }),
  });
  expect(receipt.sources[0].error).toBe('conflicting source item identities');
  expect(client.calls.upserts.some(({table}) => table === 'content_items')).toBeFalse();
});

for (const guidFirst of [false, true]) {
  test(`compatible duplicate URLs keep their known GUID (GUID first: ${guidFirst})`, async () => {
    const client = fakeClient();
    const withGuid = { ...validItem, external_id: 'known-guid' };
    const withoutGuid = { ...validItem, external_id: null };
    await runIngestion({manifest: { ...manifest, sources: [manifest.sources[0]] }, client,
      fetchSourceImpl: async () => ({status: 'success', httpStatus: 200,
        items: guidFirst ? [withGuid, withoutGuid] : [withoutGuid, withGuid]})});
    const rows = client.calls.upserts.find(({table}) => table === 'content_items').rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].external_id).toBe('known-guid');
  });
}

test('previous failures force an unconditional fetch even if old code stored fresh validators', async () => {
  const { sourceRows } = manifestRows(manifest);
  const client = fakeClient({existingSources: [{id: sourceRows[0].id,
    source_key: manifest.sources[0].sourceKey, consecutive_failures: 1,
    etag: '"poisoned"', last_modified: 'poisoned-date'}]});
  let requestedState;
  await runIngestion({manifest: { ...manifest, sources: [manifest.sources[0]] }, client,
    fetchSourceImpl: async (_source, options) => {
      requestedState = options.previousState;
      return {status: 'success', httpStatus: 200, items: [validItem]};
    }});
  expect(requestedState).toEqual({etag: null, lastModified: null});
});

test('resolved targets cannot hide conflicting GUID claims behind historical URL identity', async () => {
  const { sourceRows } = manifestRows(manifest);
  const client = fakeClient({existingContentItems: [{id: 'old-id', source_id: sourceRows[0].id,
    canonical_url: validItem.url, external_id: 'G', published_at: validItem.published_at,
    first_seen_at: validItem.published_at}]});
  const receipt = await runIngestion({manifest: {...manifest, sources: [manifest.sources[0]]}, client,
    fetchSourceImpl: async () => ({status: 'success', httpStatus: 200, items: [
      {...validItem, external_id: 'H'}, {...validItem, url: `${validItem.url}-new`, external_id: 'G'},
    ]})});
  expect(receipt.sources[0].error).toBe('conflicting source item identities');
  expect(client.calls.upserts.some(({table}) => table === 'content_items')).toBeFalse();
});

for (const guidFirst of [false, true]) {
  test(`URL-drift duplicates resolve together before GUID lookup (GUID first: ${guidFirst})`, async () => {
    const { sourceRows } = manifestRows(manifest);
    const historical = {id: 'historical', source_id: sourceRows[0].id,
      canonical_url: validItem.url, external_id: 'G', published_at: validItem.published_at,
      first_seen_at: validItem.published_at};
    const client = fakeClient({existingContentItems: [historical]});
    const withGuid = {...validItem, url: `${validItem.url}-new`, external_id: 'G'};
    const withoutGuid = {...withGuid, external_id: null};
    await runIngestion({manifest: {...manifest, sources: [manifest.sources[0]]}, client,
      fetchSourceImpl: async () => ({status: 'success', httpStatus: 200,
        items: guidFirst ? [withGuid, withoutGuid] : [withoutGuid, withGuid]})});
    const rows = client.calls.upserts.find(({table}) => table === 'content_items').rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject(historical);
    expect(client.calls.upserts.find(({table}) => table === 'events').rows).toHaveLength(1);
  });
}
