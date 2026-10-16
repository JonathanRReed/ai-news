import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { entities, sources } from '../../config/intelligence-sources.mjs';
import { collectLegacyArticles } from './export-cache.mjs';
import { fetchSource } from './fetch-source.mjs';
import { runIngestion } from './ingest.mjs';
import { normalizeItem, normalizeUrl, stableItemId } from './normalize.mjs';
import { parsePageMetadata } from './parse-sitemap.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const zai = sources.find(({ sourceKey }) => sourceKey === 'z-ai-release-notes');
const deepseek = sources.find(({ sourceKey }) => sourceKey === 'deepseek-api-news');
const pageUrl = 'https://docs.z.ai/release-notes/new-released';
const overview = {
  id: stableItemId('z-ai-release-notes', pageUrl),
  legacy_id: null,
  source_id: 'source-z-ai',
  canonical_url: pageUrl,
  title: 'New Released - Overview - Z.AI DEVELOPER DOCUMENT',
  published_at: '2026-08-28T00:00:00.000Z',
  first_seen_at: '2026-08-28T00:00:00.000Z',
};

function siteFetch(pages) {
  return async (url) => {
    const body = pages[url.toString()];
    return new globalThis.Response(body ?? 'missing', { status: body === undefined ? 404 : 200 });
  };
}

// Mirrors the content_items unique (canonical_url) upsert and the public feed view.
function memoryClient(existing) {
  const content = new Map(existing.map((row) => [row.canonical_url, { ...row }]));
  return {
    content,
    async selectRows(table, query = {}) {
      if (table === 'content_items') {
        return query.offset ? [] : [...content.values()].map((row) => ({ ...row }));
      }
      if (table === 'intelligence_feed_v1') {
        return [...content.values()]
          .map((row) => ({
            ...row,
            entity_name: 'Z.AI',
            excerpt: row.excerpt ?? '',
            content: row.content ?? '',
            source_key: 'z-ai-release-notes',
            source_url: 'https://docs.z.ai/sitemap.xml',
            source_type: 'scraped',
          }))
          .sort((a, b) => b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id));
      }
      return [];
    },
    async upsertRows(table, rows) {
      if (table !== 'content_items') return;
      for (const row of rows) content.set(row.canonical_url, { ...content.get(row.canonical_url), ...row });
    },
    async patchRows() {},
    async rpc(name) { return name === 'start_intelligence_ingestion' ? 'run-1' : null; },
  };
}

describe('Z.AI changelog sections through ingestion and export', () => {
  test('eight section identities survive repeat ingestion without touching the overview', async () => {
    const sitemap = await fixture('zai-sitemap.xml');
    const page = await fixture('zai-new-released.html');
    const client = memoryClient([overview]);
    const ingest = (xml, now) => runIngestion({
      manifest: { entities, sources: [zai] },
      client,
      fetchImpl: siteFetch({ 'https://docs.z.ai/sitemap.xml': xml, [pageUrl]: page }),
      now,
    });

    await ingest(sitemap, '2026-10-16T12:00:00.000Z');
    const firstIds = [...client.content.values()].map(({ id }) => id).sort();
    await ingest(sitemap.replace('2026-10-10T10:16:52.597Z', '2026-10-17T09:00:00.000Z'), '2026-10-17T12:00:00.000Z');
    const rows = [...client.content.values()];

    const sections = rows.filter(({ canonical_url }) => canonical_url !== pageUrl);
    expect(sections).toHaveLength(8);
    expect(new Set(sections.map(({ id }) => id)).size).toBe(8);
    expect(sections.map(({ canonical_url }) => new URL(canonical_url).hash).sort()).toEqual([
      '#2025-09-30', '#2025-12-22', '#2026-01-14', '#2026-02-12',
      '#2026-04-07', '#2026-06-16', '#2026-08-18', '#2026-08-26',
    ]);
    expect(rows.map(({ id }) => id).sort()).toEqual(firstIds);
    expect(client.content.get(pageUrl)).toEqual(overview);

    const exported = await collectLegacyArticles({ client, manifestSources: [zai] });
    expect(exported).toHaveLength(9);
    expect(new Set(exported.map(({ id }) => id)).size).toBe(9);
    expect(exported.find(({ url }) => url === `${pageUrl}#2026-08-26`)).toMatchObject({
      title: 'GLM-5.3-Flash',
      published_at: '2026-08-26T00:00:00.000Z',
    });
  });

  test('fragments stay stripped for every other URL and ID', () => {
    const tagged = 'https://x.ai/news/grok-4-7?utm_source=a#2026-09-21';
    expect(normalizeUrl(tagged)).toBe('https://x.ai/news/grok-4-7');
    expect(stableItemId('xai-news-sitemap', tagged)).toBe(stableItemId('xai-news-sitemap', 'https://x.ai/news/grok-4-7'));
    const item = normalizeItem(
      { url: tagged, title: 'Introducing Grok 4.7', published_at: '2026-09-21T00:00:00.000Z' },
      { ...sources.find(({ sourceKey }) => sourceKey === 'xai-news-sitemap'), entityName: 'xAI' },
      { now: '2026-10-16T00:00:00.000Z' },
    );
    expect(item.canonical_url).toBe('https://x.ai/news/grok-4-7');
    expect(item.id).toBe(stableItemId('xai-news-sitemap', 'https://x.ai/news/grok-4-7'));
  });

  test('a changelog fragment that does not match the section date is dropped', () => {
    const item = normalizeItem(
      { url: `${pageUrl}#2026-08-26`, title: 'GLM-5.3-Flash', published_at: '2026-08-27T00:00:00.000Z' },
      { ...zai, entityName: 'Z.AI' },
      { now: '2026-10-16T00:00:00.000Z' },
    );
    expect(item.canonical_url).toBe(pageUrl);
  });
});

describe('DeepSeek undated pages', () => {
  test('a sitemap lastModified never dates an unlabeled short-slug page', async () => {
    const page = (await fixture('deepseek-news0725.html')).replace(/ \d{4}\/\d{2}\/\d{2}<\/a>/, '</a>');
    const url = 'https://api-docs.deepseek.com/news/news0725';
    expect(parsePageMetadata(deepseek, page, url, { lastModified: '2026-10-01T00:00:00.000Z' })).toBeNull();

    const sitemap = `<?xml version="1.0"?><urlset><url><loc>${url}</loc><lastmod>2026-10-01</lastmod></url></urlset>`;
    const result = await fetchSource(deepseek, {
      fetchImpl: siteFetch({ 'https://api-docs.deepseek.com/sitemap.xml': sitemap, [url]: page }),
    });
    expect(result.items).toEqual([]);
  });
});
