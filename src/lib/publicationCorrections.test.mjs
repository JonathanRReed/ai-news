import { expect, test } from 'bun:test';
import { correctedPublicationDate } from './publicationCorrections.mjs';
const url = 'https://cohere.com/blog/ai-in-oil-and-gas';
test('corrects only the verified publisher record and old timestamp', () => {
  expect(correctedPublicationDate('cohere-sitemap', url, '2026-09-30T00:00:00+00:00')).toBe('2025-01-29T15:38:00.000Z');
  expect(correctedPublicationDate('another-source', url, '2026-09-30T00:00:00Z')).toBe('2026-09-30T00:00:00Z');
  expect(correctedPublicationDate('cohere-sitemap', `${url}-other`, '2026-09-30T00:00:00Z')).toBe('2026-09-30T00:00:00Z');
  expect(correctedPublicationDate('cohere-sitemap', url, '2025-01-29T15:38:00.000Z')).toBe('2025-01-29T15:38:00.000Z');
});
