import { describe, expect, test } from 'bun:test';
import { verifyLegacyArticleRecords, verifyRouteAliases } from './verify-routes.mjs';
import legacyRecords from '../../src/data/legacy-article-records.json';

describe('verifyRouteAliases', () => {
  test('accepts aliases whose destinations exist in the canonical cache', () => {
    const result = verifyRouteAliases(
      [{ id: 'canonical-a' }],
      [{ legacy_id: 'legacy-a', destination_path: '/article/canonical-a' }],
    );
    expect(result).toEqual({
      ok: true,
      duplicateArticleIds: [],
      invalidArticleIds: [],
      missingTargets: [],
      invalidAliases: [],
    });
  });

  test('rejects missing destinations and malformed alias paths', () => {
    const result = verifyRouteAliases(
      [{ id: 'canonical-a' }],
      [
        { legacy_id: 'legacy-a', destination_path: '/article/missing' },
        { legacy_id: 'legacy-b', destination_path: 'javascript:alert(1)' },
      ],
    );
    expect(result.ok).toBeFalse();
    expect(result.missingTargets).toEqual(['legacy-a -> missing']);
    expect(result.invalidAliases).toEqual(['legacy-b']);
  });

  test('rejects an alias that shadows a different canonical article route', () => {
    const result = verifyRouteAliases(
      [{ id: 'canonical-a' }, { id: 'canonical-b' }],
      [{ legacy_id: 'canonical-a', destination_path: '/article/canonical-b' }],
    );

    expect(result.ok).toBeFalse();
    expect(result.invalidAliases).toEqual(['canonical-a']);
  });

  test.each([
    '../about',
    'foo/bar',
    '%2fadmin',
    'item?preview=1',
    'item#fragment',
    '.',
    '..',
    'item\u0000',
  ])('rejects unsafe legacy alias id %s', (legacyId) => {
    const result = verifyRouteAliases(
      [{ id: 'canonical-a' }],
      [{ legacy_id: legacyId, destination_path: '/article/canonical-a' }],
    );

    expect(result.ok).toBeFalse();
    expect(result.invalidAliases).toEqual([legacyId]);
  });

  test('rejects unsafe canonical article IDs and encoded destination targets', () => {
    const result = verifyRouteAliases(
      [{ id: '../about' }, { id: 'canonical-a' }],
      [{ legacy_id: 'legacy-a', destination_path: '/article/%2fadmin' }],
    );

    expect(result.ok).toBeFalse();
    expect(result.invalidArticleIds).toEqual(['../about']);
    expect(result.invalidAliases).toEqual(['legacy-a']);
  });
});

describe('verifyLegacyArticleRecords', () => {
  test('keeps the archived public routes admissible and unique', () => {
    expect(verifyLegacyArticleRecords(legacyRecords)).toEqual({
      ok: true,
      duplicateIds: [],
      invalidRecords: [],
    });
  });

  test('rejects duplicate or unadmitted archived routes', () => {
    const result = verifyLegacyArticleRecords([
      legacyRecords[0],
      legacyRecords[0],
      { ...legacyRecords[1], url: 'https://unrelated.example/article' },
    ]);
    expect(result.ok).toBeFalse();
    expect(result.duplicateIds).toEqual([legacyRecords[0].id]);
    expect(result.invalidRecords).toEqual([legacyRecords[1].id]);
  });
});
