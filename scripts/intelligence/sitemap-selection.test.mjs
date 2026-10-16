import { describe, expect, test } from 'bun:test';
import { sources } from '../../config/intelligence-sources.mjs';
import { fetchSource } from './fetch-source.mjs';

const deepseek = sources.find(({ sourceKey }) => sourceKey === 'deepseek-api-news');
const NEWS = 'https://api-docs.deepseek.com/news/';
const CAP = 25;

function sitemapXml(entries) {
  const urls = entries.map(({ loc, lastmod }) => (
    `<url><loc>${loc}</loc>${lastmod === undefined ? '' : `<lastmod>${lastmod}</lastmod>`}</url>`
  ));
  return `<?xml version="1.0"?><urlset>${urls.join('')}</urlset>`;
}

function newsPage(url, title) {
  return `<html><head><title>${title} | DeepSeek API Docs</title><link rel="canonical" href="${url}"></head><body></body></html>`;
}

// Serves the given XML documents and a minimal page for every other URL, recording page requests.
function recordingFetch(xmlByUrl) {
  const pageRequests = [];
  const fetchImpl = async (input) => {
    const url = input.toString();
    if (xmlByUrl[url] !== undefined) {
      return new globalThis.Response(xmlByUrl[url], { status: 200, headers: { 'content-type': 'application/xml' } });
    }
    pageRequests.push(url);
    return new globalThis.Response(newsPage(url, url.split('/').pop()), {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  };
  return { fetchImpl, pageRequests };
}

const legacySlugs = Array.from({ length: 30 }, (_, i) => `news${String(101 + i).padStart(4, '0')}`);
const datedSlugs = ['news250115', 'news251201', 'news260424', 'news260910', 'news261015'];

describe('sitemap page selection above the request cap', () => {
  test('recent dated slugs are fetched even when legacy undated slugs exceed the cap', async () => {
    const entries = [...legacySlugs, ...datedSlugs].map((slug) => ({ loc: `${NEWS}${slug}` }));
    const { fetchImpl, pageRequests } = recordingFetch({ [deepseek.endpointUrl]: sitemapXml(entries) });

    const result = await fetchSource(deepseek, { fetchImpl });

    expect(pageRequests).toHaveLength(CAP);
    expect(pageRequests.slice(0, datedSlugs.length)).toEqual(
      [...datedSlugs].reverse().map((slug) => `${NEWS}${slug}`),
    );
    expect(result.items.map(({ published_at }) => published_at).slice(0, 2)).toEqual([
      '2026-10-15T00:00:00.000Z',
      '2026-09-10T00:00:00.000Z',
    ]);
  });

  test('legacy slugs never receive an invented publication date', async () => {
    const entries = [...legacySlugs.slice(0, 3), 'news261015'].map((slug) => ({ loc: `${NEWS}${slug}` }));
    const { fetchImpl } = recordingFetch({ [deepseek.endpointUrl]: sitemapXml(entries) });

    const result = await fetchSource(deepseek, { fetchImpl });

    expect(result.items.map(({ url }) => url)).toEqual([`${NEWS}news261015`]);
  });

  test('missing and invalid lastmod values rank after valid discovery dates', async () => {
    const entries = [
      ...legacySlugs.map((slug) => ({ loc: `${NEWS}${slug}`, lastmod: 'not-a-date' })),
      { loc: `${NEWS}news261001`, lastmod: '' },
      { loc: `${NEWS}news260101`, lastmod: 'yesterday' },
    ];
    const { fetchImpl, pageRequests } = recordingFetch({ [deepseek.endpointUrl]: sitemapXml(entries) });

    await fetchSource(deepseek, { fetchImpl });

    expect(pageRequests.slice(0, 2)).toEqual([`${NEWS}news261001`, `${NEWS}news260101`]);
  });

  test('duplicate URLs use one request slot and keep the best discovery date', async () => {
    const nested = 'https://api-docs.deepseek.com/news-sitemap.xml';
    const dupe = `${NEWS}news9999`;
    const top = sitemapXml([
      { loc: dupe, lastmod: '2026-10-14' },
      ...legacySlugs.map((slug) => ({ loc: `${NEWS}${slug}` })),
    ]).replace('</urlset>', `<sitemap><loc>${nested}</loc></sitemap></urlset>`);
    const xml = {
      [deepseek.endpointUrl]: top,
      [nested]: sitemapXml([{ loc: dupe }, { loc: dupe, lastmod: 'bad' }]),
    };
    const { fetchImpl, pageRequests } = recordingFetch(xml);

    await fetchSource(deepseek, { fetchImpl });

    expect(pageRequests.filter((url) => url === dupe)).toHaveLength(1);
    expect(pageRequests[0]).toBe(dupe);
    expect(pageRequests).toHaveLength(CAP);
  });

  test('ordinary sources with valid lastmod keep newest-first selection and the cap', async () => {
    const source = {
      sourceKey: 'example-sitemap',
      officialUrl: 'https://example.com/news',
      endpointUrl: 'https://example.com/sitemap.xml',
      transportType: 'sitemap',
      parserKey: 'sitemap',
      active: true,
      includePaths: ['/news/'],
    };
    const entries = Array.from({ length: 40 }, (_, i) => ({
      loc: `https://example.com/news/post-${String(i).padStart(2, '0')}`,
      lastmod: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
    }));
    entries.push({ loc: 'https://example.com/about/team', lastmod: '2026-09-30' });
    entries.push({ loc: 'https://other.example/news/offsite', lastmod: '2026-09-30' });
    const { fetchImpl, pageRequests } = recordingFetch({ [source.endpointUrl]: sitemapXml(entries) });

    await fetchSource(source, { fetchImpl });

    const expected = entries
      .filter(({ loc }) => loc.startsWith('https://example.com/news/'))
      .sort((a, b) => Date.parse(b.lastmod) - Date.parse(a.lastmod) || a.loc.localeCompare(b.loc))
      .slice(0, CAP)
      .map(({ loc }) => loc);
    expect(pageRequests).toEqual(expected);
  });
});
