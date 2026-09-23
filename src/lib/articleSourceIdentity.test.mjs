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
