import { expect, test } from 'bun:test';
import { articleSourceIdentity } from './articleSourceIdentity.mjs';

test('matches an old tracked URL to the same publisher page without tracking parameters', () => {
  expect(articleSourceIdentity('https://www.example.com/news/release/?utm_source=rss'))
    .toBe(articleSourceIdentity('https://example.com/news/release'));
  expect(articleSourceIdentity('https://example.com/news/other'))
    .not.toBe(articleSourceIdentity('https://example.com/news/release'));
  expect(articleSourceIdentity('https://example.com/news/release?id=2'))
    .not.toBe(articleSourceIdentity('https://example.com/news/release?id=1'));
});

test('identity code stays loadable in a browser bundle', async () => {
  // A node:url import is stubbed in client builds; every identity then became "" and whole
  // sources collapsed into a single deduplicated record in the browser feed.
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('./articleSourceIdentity.mjs', import.meta.url), 'utf8');
  expect(source).not.toMatch(/from\s+['"]node:/);
  expect(articleSourceIdentity('https://www.example.com/a/?utm_source=x')).toBe('example.com/a');
});
