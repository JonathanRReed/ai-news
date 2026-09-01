import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { mergeProviderArticles } from './merge-provider-articles.mjs';

const gatherSource = await readFile(new URL('./gather-provider-feeds.mjs', import.meta.url), 'utf8');

const cachedArticle = {
  id: 'cached-history',
  company: 'OpenAI',
  title: 'Cached history',
  url: 'https://example.com/history',
  published_at: '2026-08-20T00:00:00.000Z',
  source_type: 'rss_official',
  summary: 'Cached summary',
  content: 'Cached content',
  source_url: 'https://feeds.example.com/openai.xml',
};

const gatheredArticle = {
  ...cachedArticle,
  id: 'gathered-history',
  title: 'Refreshed history',
  summary: 'Refreshed summary',
  content: 'Refreshed content',
  published_at: '2026-08-27T00:00:00.000Z',
};

const admitExampleArticle = (article) => new URL(article.url).hostname === 'example.com';

describe('mergeProviderArticles', () => {
  test('retains valid cached records missing from a successful feed window', () => {
    const currentArticle = {
      ...cachedArticle,
      id: 'current-article',
      url: 'https://example.com/current',
      title: 'Current article',
      published_at: '2026-08-26T00:00:00.000Z',
    };

    const merged = mergeProviderArticles(
      [currentArticle],
      [cachedArticle],
      { admitArticle: admitExampleArticle },
    );

    expect(merged.map((article) => article.url)).toEqual([
      currentArticle.url,
      cachedArticle.url,
    ]);
  });

  test('refreshes mutable metadata without changing a published route or date', () => {
    const merged = mergeProviderArticles(
      [gatheredArticle],
      [cachedArticle],
      { admitArticle: admitExampleArticle },
    );

    expect(merged).toEqual([{
      ...gatheredArticle,
      id: cachedArticle.id,
      published_at: cachedArticle.published_at,
    }]);
  });

  test('drops a cached record that no longer satisfies source admission', () => {
    const poisoned = { ...cachedArticle, id: 'poisoned', url: 'https://attacker.example/payload' };
    expect(mergeProviderArticles([], [poisoned], { admitArticle: admitExampleArticle })).toEqual([]);
  });

  test.each(['../about', 'foo/bar', '%2fadmin', 'item?preview=1', 'item#fragment'])('rejects unsafe article route id %s', (id) => {
    expect(() => mergeProviderArticles(
      [{ ...gatheredArticle, id }],
      [],
      { admitArticle: admitExampleArticle },
    )).toThrow('article id must be a safe single URL path segment');
  });
});

describe('legacy provider gatherer security boundary', () => {
  test('reuses the admitted redirect, body-size, and item-host policy', () => {
    expect(gatherSource).toContain("from './intelligence/source-policy.mjs'");
    expect(gatherSource).toContain('fetchAdmittedResponse');
    expect(gatherSource).toContain('readBoundedText');
    expect(gatherSource).toContain('admittedHttpsUrl');
    expect(gatherSource).not.toContain("redirect: 'follow'");
  });

  test('never restores an unfiltered cache after admission removes every row', () => {
    expect(gatherSource).not.toContain('articles = existing;');
    expect(gatherSource).toContain('Refusing to publish an empty admitted cache');
  });
});
