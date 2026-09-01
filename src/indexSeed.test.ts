import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./pages/index.astro', import.meta.url), 'utf8');

test('the hydration seed keeps admission provenance while omitting full article content', () => {
  const seedBlock = source.slice(
    source.indexOf('const initialArticles:'),
    source.indexOf('const leadArticleLogo'),
  );

  expect(seedBlock).toContain('source_url: a.source_url');
  expect(seedBlock).toContain('source_key: a.source_key');
  expect(seedBlock).not.toContain('content: a.content');
});
