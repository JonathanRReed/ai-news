import { describe, expect, test } from 'bun:test';
import { verifyRouteAliases } from './verify-routes.mjs';

describe('verifyRouteAliases', () => {
  test('accepts aliases whose destinations exist in the canonical cache', () => {
    const result = verifyRouteAliases(
      [{ id: 'canonical-a' }],
      [{ legacy_id: 'legacy-a', destination_path: '/article/canonical-a' }],
    );
    expect(result).toEqual({ ok: true, duplicateArticleIds: [], missingTargets: [], invalidAliases: [] });
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
});
