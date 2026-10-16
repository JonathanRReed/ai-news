import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, sep, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function checkBuiltLinks(directory) {
  const root = resolve(directory);
  const files = new Set();
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.add(relative(root, absolute).split(sep).join('/'));
    }
  }
  await stat(root);
  await walk(root);
  const failures = new Map();
  let pages = 0;
  const origin = 'https://ai-news.helloworldfirm.com';
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    pages++;
    const html = await readFile(join(root, file), 'utf8');
    const base = `${origin}/${file.replace(/index\.html$/, '')}`;
    for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
      const href = match[1].replaceAll('&amp;', '&');
      let url;
      try { url = new URL(href, base); } catch { failures.set(href, file); continue; }
      if (url.origin !== origin) continue;
      let path;
      try { path = decodeURIComponent(url.pathname).replace(/^\//, '').replace(/\/$/, ''); }
      catch { failures.set(href, file); continue; }
      if (files.has(path) || files.has(path ? `${path}/index.html` : 'index.html')) continue;
      failures.set(url.pathname, file);
    }
  }
  return { pages, failures: [...failures].map(([target, from]) => ({ target, from })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await checkBuiltLinks(process.argv[2] ?? 'dist');
  if (result.failures.length) {
    console.error('Broken internal links:', result.failures);
    process.exitCode = 1;
  } else {
    console.log(`Checked internal links across ${result.pages} built pages.`);
  }
}
