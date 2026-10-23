import { readFileSync } from 'node:fs';
import { expect, test } from 'bun:test';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('developer and CI Node pins agree', () => {
  expect(read('.nvmrc').trim()).toBe(read('.node-version').trim());
  expect(read('.node-version').trim()).toBe('24.22.1');
});

test('both workflows install the package-manager Bun version', () => {
  const pkg = JSON.parse(read('package.json'));
  const version = pkg.packageManager.replace(/^bun@/, '');
  for (const path of ['.github/workflows/verify.yml', '.github/workflows/refresh-feeds.yml']) {
    const source = read(path);
    expect(source).toContain(`bun-version: "${version}"`);
    expect(source).toContain('node-version-file: .node-version');
  }
});
