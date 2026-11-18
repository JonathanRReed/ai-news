import { expect, test } from 'bun:test';
import { correctionFor, mergeCorrections, needsCorrection } from './verify-publication-dates.mjs';

test('only a different UTC day counts as a wrong date', () => {
  expect(needsCorrection('2026-09-10T18:19:12+00:00', '2025-11-24T00:00:00.000Z')).toBe(true);
  expect(needsCorrection('2026-09-10T18:19:12+00:00', '2026-09-10T00:00:00.000Z')).toBe(false);
  // Either side of midnight by a few hours is clock precision, not another publication day.
  expect(needsCorrection('2026-09-10T23:30:00Z', '2026-09-11T01:00:00Z')).toBe(false);
  expect(needsCorrection('2026-09-10T18:19:12Z', '')).toBe(false);
  expect(needsCorrection('not a date', '2025-11-24T00:00:00.000Z')).toBe(false);
});

test('corrections merge deterministically and keep the first verification of an unchanged answer', () => {
  const record = { source_key: 'b-sitemap', url: 'https://example.com/b', published_at: '2026-09-10T18:19:12+00:00' };
  const first = correctionFor(record, '2025-11-24T00:00:00Z', '2026-11-18');
  expect(first).toEqual({
    sourceKey: 'b-sitemap',
    url: 'https://example.com/b',
    recorded: '2026-09-10T18:19:12.000Z',
    published_at: '2025-11-24T00:00:00.000Z',
    verified: '2026-11-18',
  });
  const other = correctionFor({ ...record, source_key: 'a-sitemap', url: 'https://example.com/a' }, '2024-01-02T00:00:00Z', '2026-11-18');
  const again = correctionFor(record, '2025-11-24T00:00:00Z', '2026-12-01');
  const merged = mergeCorrections([first], [other, again]);
  expect(merged.map((row) => row.sourceKey)).toEqual(['a-sitemap', 'b-sitemap']);
  expect(merged[1].verified).toBe('2026-11-18');
  const changed = correctionFor(record, '2025-11-25T00:00:00Z', '2026-12-01');
  expect(mergeCorrections([first], [changed])[0].published_at).toBe('2025-11-25T00:00:00.000Z');
  // A record never gets two rows, even if its stored timestamp differs between runs.
  const restamped = correctionFor({ ...record, published_at: '2026-09-11T00:00:00Z' }, '2025-11-24T00:00:00Z', '2026-12-01');
  expect(mergeCorrections([first], [restamped])).toHaveLength(1);
});
