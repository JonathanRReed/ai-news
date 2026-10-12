import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import aliases from '../../public/data/route-aliases.json';
import articles from '../../public/data/provider-articles.json';
import verifiedSources from '../../src/data/deepmind-source-urls.json';
import provenance from '../../docs/operations/repairs/2026-10-12-remaining-provider-routes.json';
import { isArticleAdmitted } from '../../src/lib/articleAdmission.ts';

describe('remaining published provider aliases', () => {
  test.each(provenance.aliases)('retains $legacy_id with its proven publisher identity', (repair) => {
    const hash = createHash('sha256').update(`${repair.original_company}:${repair.original_url}`).digest('hex').slice(0, 18);
    expect(repair.legacy_id).toBe(`provider-${hash}`);
    expect(aliases.filter(({ legacy_id }) => legacy_id === repair.legacy_id)).toEqual([
      { legacy_id: repair.legacy_id, destination_path: repair.destination_path },
    ]);
    const target = articles.find(({ id }) => id === repair.expected_legacy_id);
    expect(target).toBeDefined();
    expect(isArticleAdmitted(target)).toBeTrue();
    expect(target.company).toBe(repair.original_company);
    expect(target.title).toBe(repair.expected_title);
    expect(new Date(target.published_at).toISOString()).toBe(repair.expected_published_at);
    const verified = verifiedSources.find(({ id }) => id === target.id);
    if (target.url !== repair.expected_canonical_url) {
      expect(verified).toEqual({
        id: target.id,
        from: repair.expected_canonical_url,
        to: target.url,
      });
    }
    expect(repair.destination_path).toBe(`/article/${target.id}`);
  });
});
