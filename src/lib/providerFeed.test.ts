import { expect, test } from 'bun:test';
import { GET } from '../pages/data/provider-feed.json.js';
import source from '../../public/data/provider-articles.json';
import { admittedArticles, isInternalReleaseBuild } from './articleAdmission.js';
import type { Article } from '../types/article.js';

test('saved-article export retains admitted operational builds omitted from news views', async () => {
  const expected = admittedArticles(source as Article[], { includeInternalBuilds: true }).filter(isInternalReleaseBuild);
  expect(expected.length).toBeGreaterThan(0);
  const response = await GET({} as Parameters<typeof GET>[0]);
  const rows = await response.json() as Article[];
  const ids = new Set(rows.map(row => row.id));
  for (const article of expected) expect(ids.has(article.id)).toBe(true);
  expect(admittedArticles(rows).some(isInternalReleaseBuild)).toBe(false);
});
