// Re-reads the publisher page behind each sitemap-sourced record and compares the page's own
// publication date with the stored one. Older records were dated from sitemap lastmod, which
// tracks edits. Stored records are immutable, so every disagreement becomes a row in
// src/data/publication-corrections.json, applied at export and at read time.
//
// Usage: bun scripts/intelligence/verify-publication-dates.mjs [--source <key>] [--limit <n>] [--dry-run]
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import { sources as manifestSources } from '../../config/intelligence-sources.mjs';
import { parsePageMetadata } from './parse-sitemap.mjs';
import { fetchAdmittedResponse, readBoundedText } from './source-policy.mjs';

const CACHE_PATH = fileURLToPath(new URL('../../public/data/provider-articles.json', import.meta.url));
const CORRECTIONS_PATH = fileURLToPath(new URL('../../src/data/publication-corrections.json', import.meta.url));
const DEFAULT_USER_AGENT = 'ai-news-intelligence-index/2.0 (+https://ai-news.helloworldfirm.com)';
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const HOST_CONCURRENCY = 2;
const REQUEST_GAP_MS = 300;
const DAY_MS = 86_400_000;

export function utcDay(value) {
  const timestamp = Date.parse(value ?? '');
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10);
}

// A correction is only worth recording when the publisher's date falls on another UTC day.
// Same-day differences are clock precision, not a wrong date.
export function needsCorrection(recordedAt, pageDate) {
  const recorded = Date.parse(recordedAt ?? '');
  const page = Date.parse(pageDate ?? '');
  if (Number.isNaN(recorded) || Number.isNaN(page)) return false;
  return utcDay(recordedAt) !== utcDay(pageDate) && Math.abs(recorded - page) >= DAY_MS / 2;
}

export function correctionFor(record, pageDate, verifiedAt) {
  return {
    sourceKey: record.source_key,
    url: record.url,
    recorded: new Date(Date.parse(record.published_at)).toISOString(),
    published_at: new Date(Date.parse(pageDate)).toISOString(),
    verified: verifiedAt,
  };
}

// Deterministic file order: source, then URL, so reruns produce reviewable diffs.
export function mergeCorrections(existing, found) {
  // One row per record, the same key the site reads with. A newer finding replaces the row
  // unless it says exactly the same thing, in which case the first verification date stays.
  const keyOf = (row) => `${row.sourceKey}\n${row.url}`;
  const byKey = new Map(existing.map((row) => [keyOf(row), row]));
  for (const row of found) {
    const previous = byKey.get(keyOf(row));
    const unchanged = previous && previous.published_at === row.published_at && previous.recorded === row.recorded;
    byKey.set(keyOf(row), unchanged ? previous : row);
  }
  return [...byKey.values()].sort((left, right) => (
    left.sourceKey.localeCompare(right.sourceKey) || left.url.localeCompare(right.url) || left.recorded.localeCompare(right.recorded)
  ));
}

async function pageDate(source, url, userAgent, fetchImpl) {
  const response = await fetchAdmittedResponse(source, url, {
    fetchImpl,
    headers: { accept: 'text/html', 'user-agent': userAgent },
  });
  if (!response.ok) return { status: response.status, date: null };
  const html = await readBoundedText(response, MAX_HTML_BYTES);
  // No lastModified option: the date must come from the page itself or not at all.
  return { status: response.status, date: parsePageMetadata(source, html, url)?.published_at ?? null };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const onlySource = flag('--source');
  const limit = Number(flag('--limit') ?? Number.POSITIVE_INFINITY);
  const dryRun = args.includes('--dry-run');
  const userAgent = process.env.VERIFY_USER_AGENT || DEFAULT_USER_AGENT;
  const verifiedAt = new Date().toISOString().slice(0, 10);

  const sitemapSources = new Map(
    manifestSources
      .filter((source) => source.parserKey === 'sitemap' && (!onlySource || source.sourceKey === onlySource))
      .map((source) => [source.sourceKey, source]),
  );
  const records = JSON.parse(await readFile(CACHE_PATH, 'utf8'))
    .filter((record) => sitemapSources.has(record.source_key))
    .slice(0, limit);
  const existing = JSON.parse(await readFile(CORRECTIONS_PATH, 'utf8').catch(() => '[]'));

  const byHost = new Map();
  for (const record of records) {
    const host = new URL(record.url).hostname;
    byHost.set(host, [...(byHost.get(host) ?? []), record]);
  }

  const found = [];
  const summary = { checked: 0, agree: 0, corrected: 0, undated: 0, failed: 0 };
  await Promise.all([...byHost.values()].map(async (queue) => {
    const worker = async () => {
      for (let record = queue.shift(); record; record = queue.shift()) {
        summary.checked += 1;
        try {
          const { status, date } = await pageDate(sitemapSources.get(record.source_key), record.url, userAgent, fetch);
          if (!date) {
            summary[status >= 400 ? 'failed' : 'undated'] += 1;
          } else if (needsCorrection(record.published_at, date)) {
            summary.corrected += 1;
            found.push(correctionFor(record, date, verifiedAt));
          } else {
            summary.agree += 1;
          }
        } catch {
          summary.failed += 1;
        }
        await delay(REQUEST_GAP_MS);
      }
    };
    await Promise.all(Array.from({ length: HOST_CONCURRENCY }, worker));
  }));

  const merged = mergeCorrections(existing, found);
  if (!dryRun) await writeFile(CORRECTIONS_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...summary, written: dryRun ? 0 : merged.length })}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exit(1);
  });
}
