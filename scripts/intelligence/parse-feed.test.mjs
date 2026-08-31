import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { parseAtom, parseRss } from './parse-feed.mjs';

const rss = await readFile(new URL('./fixtures/rss.xml', import.meta.url), 'utf8');
const atom = await readFile(new URL('./fixtures/atom.xml', import.meta.url), 'utf8');
const source = {
  sourceKey: 'example',
  officialUrl: 'https://example.com/news',
  endpointUrl: 'https://example.com/feed.xml',
};

describe('parseRss', () => {
  test('decodes markup and skips incomplete entries', () => {
    expect(parseRss(source, rss)).toEqual([{
      external_id: 'release-1',
      title: 'Model & Tool Release',
      url: 'https://example.com/news/release-1?utm_source=rss',
      published_at: '2026-08-20T12:00:00.000Z',
      summary: 'A concise publisher summary.',
      content: 'A longer publisher body.',
      source_url: 'https://example.com/feed.xml',
    }]);
  });

  test('drops item links outside the admitted HTTPS hosts', () => {
    const hostile = rss
      .replace('https://example.com/news/release-1?utm_source=rss', 'https://attacker.example/release-1')
      .replace('<guid isPermaLink="false">release-1</guid>', '<guid isPermaLink="false">https://attacker.example/id</guid>');
    expect(parseRss(source, hostile)).toEqual([]);
    expect(parseRss(source, rss.replaceAll('https://example.com/', 'http://example.com/'))).toEqual([]);
  });

  test('accepts a curated alternate host only when it is explicit', () => {
    const alternate = rss.replace(
      'https://example.com/news/release-1?utm_source=rss',
      'https://releases.example.net/news/release-1',
    );
    expect(parseRss({ ...source, allowedHosts: ['releases.example.net'] }, alternate))
      .toHaveLength(1);
  });
});

describe('parseAtom', () => {
  test('uses the alternate link and stable entry id', () => {
    expect(parseAtom(source, atom)).toEqual([{
      external_id: 'tag:github.com,2008:Repository/1/v1.2.3',
      title: 'Release v1.2.3',
      url: 'https://example.com/releases/v1.2.3',
      published_at: '2026-08-21T08:30:00.000Z',
      summary: 'Release notes.',
      content: 'Release notes.',
      source_url: 'https://example.com/feed.xml',
    }]);
  });

  test('drops alternate links outside the admitted HTTPS hosts', () => {
    expect(parseAtom(
      source,
      atom.replace('https://example.com/releases/v1.2.3', 'https://example.com.evil.test/releases/v1.2.3'),
    )).toEqual([]);
  });
});
