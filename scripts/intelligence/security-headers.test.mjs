import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

test('allows the Cloudflare Web Analytics beacon required by the injected script', async () => {
  const headers = await readFile(new URL('../../public/_headers', import.meta.url), 'utf8');
  const contentSecurityPolicy = headers
    .split('\n')
    .find((line) => line.trimStart().startsWith('Content-Security-Policy:'));

  expect(contentSecurityPolicy).toBeDefined();
  const connectSource = contentSecurityPolicy
    ?.split(';')
    .find((directive) => directive.trimStart().startsWith('connect-src '));

  expect(connectSource).toContain('https://cloudflareinsights.com');
});
