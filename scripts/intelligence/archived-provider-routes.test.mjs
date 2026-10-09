import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import records from '../../src/data/legacy-article-records.json';
import provenance from '../../docs/operations/repairs/2026-10-09-archived-provider-routes.json';
import { verifyLegacyArticleRecords } from './verify-routes.mjs';

describe('historical provider routes lost during feed rotation', () => {
  test.each(provenance.records)('preserves $id with its original source record', ({ id, record_sha256 }) => {
    const matches = records.filter((record) => record.id === id);
    expect(matches).toHaveLength(1);
    const record = matches[0];
    expect(createHash('sha256').update(JSON.stringify(record)).digest('hex')).toBe(record_sha256);
    expect(id).toBe('provider-' + createHash('sha256').update(record.company + ':' + record.url).digest('hex').slice(0, 18));
    expect(verifyLegacyArticleRecords([record]).ok).toBeTrue();
  });
});
