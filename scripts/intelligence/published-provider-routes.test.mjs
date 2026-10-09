import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import aliases from '../../public/data/route-aliases.json';
import articles from '../../public/data/provider-articles.json';
import verifiedSources from '../../src/data/deepmind-source-urls.json';

const publishedRoutes = [
  ['provider-7190b4349fcb77ee5d', '34481a07-ed17-495a-b383-4d67e587498a'],
  ['provider-b2f528cbf6adda4b79', 'a571d18c-b45e-4f63-98ab-57dee88b3cb8'],
  ['provider-aae0850fe609d7dcc5', 'b46a3df2-8643-405e-b1ca-77a12ab6c637'],
];

describe('published DeepMind provider routes', () => {
  test.each(publishedRoutes)('retains %s with its proven source identity', (oldId, targetId) => {
    const source = verifiedSources.find(({ id }) => id === targetId);
    expect(source).toBeDefined();
    const hash = createHash('sha256').update(`Google DeepMind:${source.from}`).digest('hex').slice(0, 18);
    expect(oldId).toBe(`provider-${hash}`);
    expect(aliases.filter(({ legacy_id }) => legacy_id === oldId)).toEqual([
      { legacy_id: oldId, destination_path: `/article/${targetId}` },
    ]);
    expect(articles.some(({ id }) => id === targetId)).toBeTrue();
  });
});
