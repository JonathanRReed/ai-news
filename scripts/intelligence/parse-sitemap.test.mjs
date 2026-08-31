import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { parsePageMetadata, parseSitemap } from './parse-sitemap.mjs';

const sitemap = await readFile(new URL('./fixtures/sitemap.xml', import.meta.url), 'utf8');
const page = await readFile(new URL('./fixtures/release-page.html', import.meta.url), 'utf8');
const source = {
  sourceKey: 'example-sitemap',
  officialUrl: 'https://example.com/news',
  endpointUrl: 'https://example.com/sitemap.xml',
  includePaths: ['/news/'],
};

describe('parseSitemap', () => {
  test('keeps only declared paths on official hosts', () => {
    expect(parseSitemap(source, sitemap)).toEqual([{
      url: 'https://example.com/news/model-release',
      lastModified: '2026-08-25T10:00:00.000Z',
      isSitemap: false,
    }]);
  });

  test('drops HTTP URLs even when their host is admitted', () => {
    expect(parseSitemap(source, sitemap.replaceAll('https://example.com/', 'http://example.com/'))).toEqual([]);
  });
});

describe('parsePageMetadata', () => {
  test('extracts first-party canonical metadata', () => {
    expect(parsePageMetadata(source, page, 'https://example.com/news/model-release')).toEqual({
      external_id: 'https://example.com/news/model-release',
      title: 'Example Model Release',
      url: 'https://example.com/news/model-release',
      published_at: '2026-08-24T09:00:00.000Z',
      summary: 'A first-party description of what changed.',
      content: 'A first-party description of what changed.',
      source_url: 'https://example.com/sitemap.xml',
    });
  });

  test('rejects an insecure or off-host canonical URL', () => {
    expect(parsePageMetadata(
      source,
      page.replace(
        'https://example.com/news/model-release',
        'http://example.com/news/model-release',
      ),
      'https://example.com/news/model-release',
    )).toBeNull();
    expect(parsePageMetadata(
      source,
      page.replace(
        'https://example.com/news/model-release',
        'https://attacker.example/news/model-release',
      ),
      'https://example.com/news/model-release',
    )).toBeNull();
  });
});
