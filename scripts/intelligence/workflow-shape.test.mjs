import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

const refresh = await readFile(new URL('../../.github/workflows/refresh-feeds.yml', import.meta.url), 'utf8');
const verify = await readFile(new URL('../../.github/workflows/verify.yml', import.meta.url), 'utf8');
const useArticles = await readFile(new URL('../../src/hooks/useArticles.ts', import.meta.url), 'utf8');
const checkoutSha = 'de0fac2e4500dabe0009e67214ff5f5447ce83dd';
const setupBunSha = '0c5077e51419868618aeaa5fe8019c62421857d6';

function position(text, value) {
  const index = text.indexOf(value);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('refresh workflow', () => {
  test('uses Bun, least privilege, and no silent ingestion failure', () => {
    expect(refresh).toContain('contents: write');
    expect(refresh).not.toContain('continue-on-error: true');
    expect(refresh).toContain(`actions/checkout@${checkoutSha}`);
    expect(refresh).toContain(`oven-sh/setup-bun@${setupBunSha}`);
    expect(refresh).not.toMatch(/uses:\s+[^\s]+@v\d/);
    expect(refresh).toContain('bun-version: "1.4.0"');
    expect(refresh).toContain('bun install --frozen-lockfile');
    expect(refresh).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
  });

  test('validates, ingests, exports, and verifies before committing', () => {
    const validation = position(refresh, 'bun run sources:validate');
    const ingestion = position(refresh, 'bun run ingest');
    const exportCache = position(refresh, 'bun run cache:export');
    const routeVerification = position(refresh, 'bun run verify:routes');
    const commit = position(refresh, 'Commit refreshed cache');

    expect(validation).toBeLessThan(ingestion);
    expect(ingestion).toBeLessThan(exportCache);
    expect(exportCache).toBeLessThan(routeVerification);
    expect(routeVerification).toBeLessThan(commit);
  });
});

describe('verification workflow', () => {
  test('has no production credentials and runs every required gate', () => {
    expect(verify).toContain('contents: read');
    expect(verify).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(verify).toContain(`actions/checkout@${checkoutSha}`);
    expect(verify).toContain(`oven-sh/setup-bun@${setupBunSha}`);
    expect(verify).not.toMatch(/uses:\s+[^\s]+@v\d/);
    for (const command of [
      'bun run lint',
      'bun run check',
      'bun run test:unit',
      'bun run sources:validate',
      'bun run test:db',
      'bun run build',
      'bun run test:e2e',
    ]) {
      expect(verify).toContain(command);
    }
  });
});

describe('browser query memory boundary', () => {
  test('retains a hard maximum for loaded infinite-query pages', () => {
    expect(useArticles).toMatch(/maxPages:\s*10\b/);
  });
});
