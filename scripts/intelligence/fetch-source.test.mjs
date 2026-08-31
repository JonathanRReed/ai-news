import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { fetchSource } from './fetch-source.mjs';

const rss = await readFile(new URL('./fixtures/rss.xml', import.meta.url), 'utf8');
const atom = await readFile(new URL('./fixtures/atom.xml', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('./fixtures/sitemap.xml', import.meta.url), 'utf8');
const page = await readFile(new URL('./fixtures/release-page.html', import.meta.url), 'utf8');
const source = {
  sourceKey: 'example-rss',
  officialUrl: 'https://example.com/news',
  endpointUrl: 'https://example.com/feed.xml',
  transportType: 'rss',
  parserKey: 'rss',
  active: true,
  includePaths: [],
};

function response(body, init = {}) {
  return new globalThis.Response(body, {
    status: init.status ?? 200,
    headers: init.headers ?? { 'content-type': 'application/rss+xml' },
  });
}

describe('fetchSource', () => {
  test('returns a successful conditional-feed result', async () => {
    const fetchImpl = async (_url, options) => {
      expect(options.headers['if-none-match']).toBe('"old"');
      return response(rss, { headers: { 'content-type': 'application/rss+xml', etag: '"new"' } });
    };

    const result = await fetchSource(source, {
      fetchImpl,
      previousState: { etag: '"old"' },
      now: '2026-08-30T00:00:00.000Z',
    });

    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(1);
    expect(result.etag).toBe('"new"');
    expect(result.fetchedAt).toBe('2026-08-30T00:00:00.000Z');
  });

  test('reports not modified without parsing an empty body', async () => {
    const result = await fetchSource(source, {
      fetchImpl: async () => response(null, { status: 304, headers: {} }),
    });

    expect(result).toMatchObject({ status: 'not_modified', items: [], httpStatus: 304 });
  });

  test('treats a successful response with zero valid items as failure', async () => {
    const result = await fetchSource(source, {
      fetchImpl: async () => response('<rss><channel></channel></rss>'),
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('parsed 0 valid items');
  });

  test('sanitizes network failures', async () => {
    const result = await fetchSource(source, {
      fetchImpl: async () => { throw new Error('socket failed with secret=abc'); },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('network request failed');
  });

  test('blocks an off-host redirect before contacting its target', async () => {
    const requested = [];
    const result = await fetchSource(source, {
      fetchImpl: async (url) => {
        requested.push(String(url));
        return response(null, {
          status: 302,
          headers: { location: 'https://attacker.example/feed.xml' },
        });
      },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('source request blocked by URL policy');
    expect(requested).toEqual([source.endpointUrl]);
  });

  test('fails safely when a feed exceeds the response byte limit', async () => {
    const result = await fetchSource(source, {
      fetchImpl: async () => response('x', {
        headers: {
          'content-type': 'application/rss+xml',
          'content-length': String(3 * 1024 * 1024),
        },
      }),
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('source response exceeded size limit');
  });

  test('applies the same body cap to Atom and root sitemap responses', async () => {
    for (const currentSource of [
      { ...source, parserKey: 'atom', transportType: 'atom' },
      {
        ...source,
        endpointUrl: 'https://example.com/sitemap.xml',
        parserKey: 'sitemap',
        transportType: 'sitemap',
      },
    ]) {
      const result = await fetchSource(currentSource, {
        fetchImpl: async () => response(currentSource.parserKey === 'atom' ? atom : sitemap, {
          headers: { 'content-length': String(3 * 1024 * 1024) },
        }),
      });
      expect(result).toMatchObject({
        status: 'failed',
        error: 'source response exceeded size limit',
      });
    }
  });

  test('isolates an oversized sitemap page without losing a valid page', async () => {
    const sitemapSource = {
      ...source,
      endpointUrl: 'https://example.com/sitemap.xml',
      parserKey: 'sitemap',
      transportType: 'sitemap',
      includePaths: ['/news/'],
    };
    const root = `
      <urlset>
        <url><loc>https://example.com/news/too-large</loc><lastmod>2026-08-26</lastmod></url>
        <url><loc>https://example.com/news/model-release</loc><lastmod>2026-08-25</lastmod></url>
      </urlset>
    `;
    const result = await fetchSource(sitemapSource, {
      fetchImpl: async (url) => {
        if (url === sitemapSource.endpointUrl) return response(root);
        if (url.endsWith('/too-large')) {
          return response('x', { headers: { 'content-length': String(3 * 1024 * 1024) } });
        }
        return response(page, { headers: { 'content-type': 'text/html' } });
      },
    });

    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].url).toBe('https://example.com/news/model-release');
  });
});
