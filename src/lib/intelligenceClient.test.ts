import { describe, expect, test } from 'bun:test';
import {
  boundedSearchTerms,
  fetchIntelligencePage,
  MAX_SEARCH_QUERY_LENGTH,
  MAX_SEARCH_TERM_LENGTH,
  MAX_SEARCH_TERMS,
  normalizeSearchQuery,
} from './intelligenceClient.js';
import { admittedArticles } from './articleAdmission.js';
import { toArticle } from './articleCompatibility.js';
import type { FeedItem } from '../types/intelligence.js';

function feedItem(index: number): FeedItem {
  return {
    id: `${String(index).padStart(8, '0')}-1111-5111-8111-111111111111`,
    legacy_id: index === 0 ? 'legacy-newest' : null,
    canonical_url: `https://example.com/${index}`,
    title: `Item ${index}`,
    excerpt: `Summary ${index}`,
    content: null,
    item_type: 'announcement',
    published_at: new Date(Date.UTC(2026, 7, 30, 12, 0, -index)).toISOString(),
    source_key: 'example-news',
    source_name: 'Example News',
    source_url: 'https://example.com/feed.xml',
    source_type: 'rss_official',
    entity_id: 'aaaaaaaa-1111-5111-8111-111111111111',
    entity_slug: 'example-lab',
    entity_name: 'Example Lab',
    entity_type: 'lab',
    event_id: null,
    event_slug: null,
    event_title: null,
    event_significance: null,
    significance_reason: null,
  };
}

const staticArticles = [
  {
    id: 'cached-a',
    company: 'Example Lab',
    title: 'Cached A',
    url: 'https://example.com/cached-a',
    published_at: '2026-08-29T00:00:00.000Z',
    source_type: 'rss_official',
  },
];

describe('fetchIntelligencePage', () => {
  test('builds an encoded keyset query and returns a tuple cursor', async () => {
    let requestedUrl = '';
    const rows = Array.from({ length: 21 }, (_, index) => feedItem(index));
    const result = await fetchIntelligencePage(
      { company: 'Example Lab', q: 'model release' },
      null,
      {
        supabaseUrl: 'https://project.supabase.co',
        anonKey: 'public-key',
        staticArticles,
        fetchImpl: async (url) => {
          requestedUrl = String(url);
          return Response.json(rows);
        },
      },
    );

    expect(result.state).toBe('live');
    expect(result.data).toHaveLength(20);
    expect(result.nextCursor).toEqual({
      publishedAt: rows[19].published_at,
      id: rows[19].id,
    });
    const url = new URL(requestedUrl);
    expect(url.pathname).toBe('/rest/v1/intelligence_feed_v1');
    expect(url.searchParams.get('entity_name')).toBe('eq.Example Lab');
    expect(url.searchParams.get('and')).toContain('title.ilike.*model*');
    expect(url.searchParams.get('limit')).toBe('21');
  });

  test('adds a strict tuple filter for the next live page', async () => {
    let requestedUrl = '';
    const cursor = {
      publishedAt: '2026-08-30T11:00:00.000Z',
      id: 'bbbbbbbb-1111-5111-8111-111111111111',
    };
    await fetchIntelligencePage({}, cursor, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles,
      fetchImpl: async (url) => {
        requestedUrl = String(url);
        return Response.json([]);
      },
    });

    const filter = new URL(requestedUrl).searchParams.get('or');
    expect(filter).toContain(`published_at.lt.${cursor.publishedAt}`);
    expect(filter).toContain(`id.lt.${cursor.id}`);
  });

  test('falls back to the verified cache and reports degraded state on live failure', async () => {
    const result = await fetchIntelligencePage({}, null, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles,
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    });

    expect(result.state).toBe('degraded');
    expect(result.data[0]).toMatchObject({ legacy_id: 'cached-a', entity_name: 'Example Lab' });
    expect(result.cacheFreshness).toBe('2026-08-29T00:00:00.000Z');
  });

  test('preserves admitted source identity through the degraded-cache conversion path', async () => {
    const admittedCache = [{
      id: 'cached-openai',
      company: 'OpenAI',
      title: 'Cached OpenAI update',
      url: 'https://openai.com/index/cached-update/',
      published_at: '2026-08-29T00:00:00.000Z',
      source_type: 'rss_official',
      source_url: 'https://openai.com/news/rss.xml',
    }];
    const result = await fetchIntelligencePage({}, null, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles: admittedCache,
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    });
    const published = admittedArticles(result.data.map(toArticle));

    expect(result.state).toBe('degraded');
    expect(result.data[0]?.source_key).toBe('openai-news');
    expect(published.map(({ id }) => id)).toEqual(['cached-openai']);
  });

  test('reports unconfigured state while retaining static browsing', async () => {
    const result = await fetchIntelligencePage({}, null, {
      supabaseUrl: '',
      anonKey: '',
      staticArticles,
      fetchImpl: async () => { throw new Error('must not call network'); },
    });

    expect(result.state).toBe('unconfigured');
    expect(result.data).toHaveLength(1);
  });

  test('rejects structurally incomplete live rows and falls back safely', async () => {
    const result = await fetchIntelligencePage({}, null, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles,
      fetchImpl: async () => Response.json([{
        id: 'live-1',
        legacy_id: null,
        canonical_url: 'https://example.com/live',
        title: 'Incomplete live item',
        published_at: '2026-08-30T00:00:00Z',
        entity_name: 'Example',
        entity_slug: 'example',
        source_key: 'example',
      }]),
    });

    expect(result.state).toBe('degraded');
    expect(result.data[0]?.id).toBe('cached-a');
  });

  test('does not send unknown company names to PostgREST', async () => {
    let fetchCalls = 0;
    const result = await fetchIntelligencePage({ company: 'Unknown Company' }, null, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles,
      fetchImpl: async () => {
        fetchCalls += 1;
        return Response.json([]);
      },
    });

    expect(fetchCalls).toBe(0);
    expect(result.state).toBe('static');
    expect(result.data).toEqual([]);
  });
});

describe('search bounds', () => {
  test('normalizes PostgREST grammar and enforces query, term, and count caps', () => {
    const raw = `Alpha,(beta).* ${'x'.repeat(100)} one two three four five six seven eight nine ten`;
    const normalized = normalizeSearchQuery(raw);
    const terms = boundedSearchTerms(raw);

    expect(normalized.length).toBeLessThanOrEqual(MAX_SEARCH_QUERY_LENGTH);
    expect(normalized).not.toMatch(/[,%().*]/);
    expect(terms).toHaveLength(MAX_SEARCH_TERMS);
    expect(terms.every((term) => term.length <= MAX_SEARCH_TERM_LENGTH)).toBe(true);
  });

  test('builds a bounded live query from hostile oversized input', async () => {
    let requestedUrl = '';
    const query = `${'A'.repeat(5000)},.*,one two three four five six seven eight nine ten`;
    await fetchIntelligencePage({ q: query }, null, {
      supabaseUrl: 'https://project.supabase.co',
      anonKey: 'public-key',
      staticArticles,
      fetchImpl: async (url) => {
        requestedUrl = String(url);
        return Response.json([]);
      },
    });

    const filter = new URL(requestedUrl).searchParams.get('and') ?? '';
    expect(filter.length).toBeLessThan(1000);
    const termCount = (filter.match(/title\.ilike/g) ?? []).length;
    expect(termCount).toBeGreaterThan(0);
    expect(termCount).toBeLessThanOrEqual(MAX_SEARCH_TERMS);
  });
});
