import { expect, test } from 'bun:test';
import { correctedPublicationDate } from './publicationCorrections.mjs';
const url = 'https://cohere.com/blog/ai-in-oil-and-gas';
test('corrects only the verified publisher record and old timestamp', () => {
  expect(correctedPublicationDate('cohere-sitemap', url, '2026-09-30T00:00:00+00:00')).toBe('2025-01-29T15:38:00.000Z');
  expect(correctedPublicationDate('another-source', url, '2026-09-30T00:00:00Z')).toBe('2026-09-30T00:00:00Z');
  expect(correctedPublicationDate('cohere-sitemap', `${url}-other`, '2026-09-30T00:00:00Z')).toBe('2026-09-30T00:00:00Z');
  expect(correctedPublicationDate('cohere-sitemap', url, '2025-01-29T15:38:00.000Z')).toBe('2025-01-29T15:38:00.000Z');
});

test('applies page-verified corrections only to the stored timestamp they were verified against', async () => {
  const { default: rows } = await import('../data/publication-corrections.json', { with: { type: 'json' } });
  expect(rows.length).toBeGreaterThan(0);
  const row = rows.find((entry) => entry.url === 'https://www.anthropic.com/news/claude-opus-4-5');
  expect(row).toBeTruthy();
  expect(correctedPublicationDate(row.sourceKey, row.url, row.recorded)).toBe(row.published_at);
  expect(row.published_at.startsWith('2025-11-24')).toBe(true);
  // A different stored timestamp means the record changed since verification: leave it.
  expect(correctedPublicationDate(row.sourceKey, row.url, '2026-01-01T00:00:00Z')).toBe('2026-01-01T00:00:00Z');
  expect(correctedPublicationDate('another-source', row.url, row.recorded)).toBe(row.recorded);
});

test('every correction row is well formed, unique, and moves the date to another UTC day', async () => {
  const { default: rows } = await import('../data/publication-corrections.json', { with: { type: 'json' } });
  const keys = new Set();
  for (const row of rows) {
    expect(new URL(row.url).protocol).toBe('https:');
    expect(Number.isNaN(Date.parse(row.recorded))).toBe(false);
    expect(Number.isNaN(Date.parse(row.published_at))).toBe(false);
    expect(row.recorded.slice(0, 10)).not.toBe(row.published_at.slice(0, 10));
    expect(row.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    keys.add(`${row.sourceKey}\n${row.url}`);
  }
  expect(keys.size).toBe(rows.length);
});
