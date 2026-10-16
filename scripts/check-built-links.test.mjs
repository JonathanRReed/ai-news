import { test, expect } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBuiltLinks } from './check-built-links.mjs';

test('built link audit resolves relative, encoded, query and canonical links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'news-links-'));
  try {
    await mkdir(join(root, 'stories'));
    await writeFile(join(root, 'index.html'), '<a href="/stories/?q=a&amp;b=c">Stories</a><a href="https://other.example/missing">External</a><a href="mailto:test@example.com">Mail</a>');
    await writeFile(join(root, 'stories/index.html'), '<a href="../#top">Home</a><a href="https://ai-news.helloworldfirm.com/stories/">Canonical</a><a href="/file%20one.json">Data</a>');
    await writeFile(join(root, 'file one.json'), '{}');
    expect(await checkBuiltLinks(root)).toEqual({ pages: 2, failures: [] });
    await writeFile(join(root, 'index.html'), '<a href="/missing/">Missing</a>');
    expect((await checkBuiltLinks(root)).failures).toEqual([{ target: '/missing/', from: 'index.html' }]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
