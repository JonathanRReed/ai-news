import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { sources } from '../../config/intelligence-sources.mjs';
import { fetchSource } from './fetch-source.mjs';
import { parseChangelogSections, parsePageMetadata } from './parse-sitemap.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const sourceFor = (key) => sources.find(({ sourceKey }) => sourceKey === key);

function siteFetch(pages) {
  return async (url) => {
    const body = pages[url.toString()];
    return new globalThis.Response(body ?? 'missing', {
      status: body === undefined ? 404 : 200,
      headers: { 'content-type': url.toString().endsWith('.xml') ? 'application/xml' : 'text/html' },
    });
  };
}

describe('Z.AI release notes changelog', () => {
  const source = sourceFor('z-ai-release-notes');
  const pageUrl = 'https://docs.z.ai/release-notes/new-released';

  test('emits one item per dated section with its anchor', async () => {
    const items = parseChangelogSections(source, await fixture('zai-new-released.html'), pageUrl);

    expect(items.map(({ url }) => new URL(url).hash)).toEqual([
      '#2026-08-26', '#2026-08-18', '#2026-06-16', '#2026-04-07',
      '#2026-02-12', '#2026-01-14', '#2025-12-22', '#2025-09-30',
    ]);
    expect(items[0]).toMatchObject({
      external_id: `${pageUrl}#2026-08-26`,
      title: 'GLM-5.3-Flash',
      published_at: '2026-08-26T00:00:00.000Z',
      source_url: 'https://docs.z.ai/sitemap.xml',
    });
    expect(items[7]).toMatchObject({
      url: `${pageUrl}#2025-09-30`,
      title: 'GLM-4.6',
      published_at: '2025-09-30T00:00:00.000Z',
    });
    expect(items[0].summary.length).toBeLessThanOrEqual(281);
    expect(items.every(({ summary }) => !summary.includes('Was this page helpful'))).toBe(true);
  });

  test('a moved sitemap lastmod on an unchanged page yields the same items', async () => {
    const sitemap = await fixture('zai-sitemap.xml');
    const page = await fixture('zai-new-released.html');
    const run = (xml) => fetchSource(source, {
      fetchImpl: siteFetch({ 'https://docs.z.ai/sitemap.xml': xml, [pageUrl]: page }),
      now: '2026-10-16T00:00:00.000Z',
    });

    const before = await run(sitemap);
    const after = await run(sitemap.replace('2026-10-10T10:16:52.597Z', '2026-10-16T09:00:00.000Z'));

    expect(before.status).toBe('success');
    expect(before.items).toHaveLength(8);
    expect(after.items).toEqual(before.items);
    expect(after.items.every(({ published_at }) => !published_at.startsWith('2026-10'))).toBe(true);
  });
});

describe('xAI news sitemap', () => {
  const source = sourceFor('xai-news-sitemap');

  test('is an active first-party newsroom source next to the third-party archive', () => {
    expect(source).toMatchObject({
      active: true,
      endpointUrl: 'https://x.ai/sitemap.xml',
      includePaths: ['/news/'],
      sourceRole: 'newsroom',
    });
    expect(sourceFor('xai-techcrunch-archive')).toMatchObject({ archiveOnly: true, sourceType: 'rss_unofficial' });
  });

  test('dates articles from datePublished and strips the site suffix', async () => {
    const result = await fetchSource(source, {
      fetchImpl: siteFetch({
        'https://x.ai/sitemap.xml': await fixture('xai-sitemap.xml'),
        'https://x.ai/news/grok-voice-3': await fixture('xai-grok-voice-3.html'),
        'https://x.ai/news/grok-4-7': await fixture('xai-grok-4-7.html'),
      }),
    });

    expect(result.items.map(({ url, title, published_at }) => ({ url, title, published_at }))).toEqual([
      { url: 'https://x.ai/news/grok-voice-3', title: 'Introducing Grok Voice 3.0', published_at: '2026-10-14T00:00:00.000Z' },
      { url: 'https://x.ai/news/grok-4-7', title: 'Introducing Grok 4.7', published_at: '2026-09-21T00:00:00.000Z' },
    ]);
  });

  test('prefers datePublished over a later sitemap lastmod', async () => {
    const item = parsePageMetadata(source, await fixture('xai-grok-4-7.html'), 'https://x.ai/news/grok-4-7', {
      lastModified: '2026-10-15T00:00:00.000Z',
    });
    expect(item.published_at).toBe('2026-09-21T00:00:00.000Z');
  });

  test('strips the suffix from a page without og:title', async () => {
    const page = (await fixture('xai-grok-4-7.html')).replace(/<meta property="og:title"[^>]*>/, '');
    expect(parsePageMetadata(source, page, 'https://x.ai/news/grok-4-7').title).toBe('Introducing Grok 4.7');
  });
});

describe('DeepSeek API news sitemap', () => {
  const source = sourceFor('deepseek-api-news');
  const base = 'https://api-docs.deepseek.com/news/';

  test('dates pages from the page label', async () => {
    const result = await fetchSource(source, {
      fetchImpl: siteFetch({
        'https://api-docs.deepseek.com/sitemap.xml': await fixture('deepseek-api-docs-sitemap.xml'),
        [`${base}news260910`]: await fixture('deepseek-news260910.html'),
        [`${base}news260821`]: await fixture('deepseek-news260821.html'),
        [`${base}news0725`]: await fixture('deepseek-news0725.html'),
      }),
    });

    const byUrl = Object.fromEntries(result.items.map((item) => [item.url, item]));
    expect(byUrl[`${base}news260910`]).toMatchObject({
      title: 'DeepSeek-V4.1-Flash: Smarter, Faster, More Efficient',
      published_at: '2026-09-10T00:00:00.000Z',
    });
    expect(byUrl[`${base}news260821`]).toMatchObject({
      title: 'DeepSeek-V4-Flash-Vision-Exp Release: Multimodal API Now Live',
      published_at: '2026-08-21T00:00:00.000Z',
    });
    expect(byUrl[`${base}news0725`].published_at).toBe('2024-07-25T00:00:00.000Z');
    expect(result.items).toHaveLength(3);
  });

  test('falls back to a six-digit slug only and never guesses a year', async () => {
    const unlabeled = (html) => html.replace(/ \d{4}\/\d{2}\/\d{2}<\/a>/, '</a>');
    const dated = parsePageMetadata(source, unlabeled(await fixture('deepseek-news260910.html')), `${base}news260910`);
    const ambiguous = parsePageMetadata(source, unlabeled(await fixture('deepseek-news0725.html')), `${base}news0725`);

    expect(dated.published_at).toBe('2026-09-10T00:00:00.000Z');
    expect(ambiguous).toBeNull();
  });
});
