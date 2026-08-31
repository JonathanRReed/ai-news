import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashReceipt, serializeReceipt, writeReceipt } from './receipt.mjs';

describe('ingestion receipts', () => {
  test('serializes deterministically regardless of object insertion order', () => {
    const left = { status: 'success', counts: { failed: 0, imported: 2 } };
    const right = { counts: { imported: 2, failed: 0 }, status: 'success' };

    expect(serializeReceipt(left)).toBe(serializeReceipt(right));
    expect(hashReceipt(left)).toBe(hashReceipt(right));
  });

  test('writes an atomic JSON receipt and returns its SHA-256', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ai-news-receipt-'));
    const path = join(directory, 'receipt.json');
    const receipt = { status: 'partial', sourceCounts: { failed: 1, succeeded: 2 } };

    try {
      const result = await writeReceipt(receipt, path);
      const stored = await readFile(path, 'utf8');
      expect(stored).toBe(serializeReceipt(receipt));
      expect(result.sha256).toBe(hashReceipt(receipt));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects secret-shaped receipt fields', () => {
    expect(() => serializeReceipt({ serviceRoleKey: 'do-not-write-this' })).toThrow(
      'receipt contains a forbidden field',
    );
  });
});
