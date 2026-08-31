import { randomUUID } from 'node:crypto';
import { open, readFile, rename } from 'node:fs/promises';
import { createAdminClient } from './supabase-rest.mjs';
import { verifyRouteAliases } from './verify-routes.mjs';
import { sources as defaultSources } from '../../config/intelligence-sources.mjs';
import { admittedHttpsUrl } from './source-policy.mjs';

function toLegacyArticle(row, sourceByKey) {
  const source = sourceByKey.get(row.source_key);
  if (!source) throw new Error(`export row references unknown source ${row.source_key}`);
  const canonicalUrl = admittedHttpsUrl(source, row.canonical_url).toString();
  return {
    id: row.legacy_id || row.id,
    company: row.entity_name,
    title: row.title,
    url: canonicalUrl,
    published_at: row.published_at,
    source_type: row.source_type || 'rss_official',
    summary: row.excerpt || '',
    content: row.content || '',
    source_url: row.source_url || '',
    source_key: row.source_key,
  };
}

function cursorFilter(row) {
  return `(${[
    `published_at.lt.${row.published_at}`,
    `and(published_at.eq.${row.published_at},id.lt.${row.id})`,
  ].join(',')})`;
}

export async function* exportLegacyArticles({
  client,
  pageSize = 250,
  manifestSources = defaultSources,
}) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error('pageSize must be an integer between 1 and 1000');
  }
  let cursor = null;
  const seenCursors = new Set();
  const sourceByKey = new Map(manifestSources.map((source) => [source.sourceKey, source]));

  while (true) {
    const query = {
      select: 'id,legacy_id,entity_name,title,canonical_url,published_at,excerpt,content,source_key,source_url,source_type',
      order: 'published_at.desc,id.desc',
      limit: pageSize,
    };
    if (cursor) query.or = cursorFilter(cursor);
    const rows = await client.selectRows('intelligence_feed_v1', query);
    if (!rows.length) return;
    yield rows.map((row) => toLegacyArticle(row, sourceByKey));
    if (rows.length < pageSize) return;
    cursor = rows.at(-1);
    const cursorKey = `${cursor.published_at}:${cursor.id}`;
    if (seenCursors.has(cursorKey)) throw new Error('keyset export cursor did not advance');
    seenCursors.add(cursorKey);
  }
}

export async function collectLegacyArticles(options) {
  const articles = [];
  for await (const page of exportLegacyArticles(options)) articles.push(...page);
  return articles;
}

export async function* exportRouteAliases({ client, pageSize = 1000 }) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error('pageSize must be an integer between 1 and 1000');
  }
  let cursor = null;
  while (true) {
    const query = {
      select: 'legacy_id,destination_path',
      order: 'legacy_id.asc',
      limit: pageSize,
    };
    if (cursor) query.legacy_id = `gt.${cursor}`;
    const rows = await client.selectRows('intelligence_route_aliases_v1', query);
    if (!rows.length) return;
    yield rows;
    if (rows.length < pageSize) return;
    const nextCursor = rows.at(-1).legacy_id;
    if (nextCursor === cursor) throw new Error('route alias cursor did not advance');
    cursor = nextCursor;
  }
}

export async function collectRouteAliases(options) {
  const aliases = [];
  for await (const page of exportRouteAliases(options)) aliases.push(...page);
  return aliases;
}

export function serializeLegacyArticles(articles) {
  return `${JSON.stringify(articles, null, 2)}\n`;
}

async function writeJsonArray(values, path, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`refusing to replace ${label} with an empty export`);
  }
  const serialized = serializeLegacyArticles(values);
  JSON.parse(serialized);
  const temporaryPath = `${path}.${globalThis.process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporaryPath, 'wx', 0o644);
  try {
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporaryPath, path);
  return { path, rows: values.length };
}

export async function writeLegacyArticles(articles, path) {
  return writeJsonArray(articles, path, 'the cache');
}

export async function writeRouteAliases(aliases, path) {
  return writeJsonArray(aliases, path, 'route aliases');
}

if (import.meta.main) {
  const client = createAdminClient({
    url: globalThis.process.env.SUPABASE_URL,
    serviceRoleKey: globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  const previousArticles = JSON.parse(await readFile('public/data/provider-articles.json', 'utf8'));
  const [articles, aliases] = await Promise.all([
    collectLegacyArticles({ client }),
    collectRouteAliases({ client }),
  ]);
  const routeVerification = verifyRouteAliases(articles, aliases);
  const nextIds = new Set(articles.map(({ id }) => id));
  const aliasIds = new Set(aliases.map(({ legacy_id: id }) => id));
  const missingPreviousIds = previousArticles
    .map(({ id }) => id)
    .filter((id) => !nextIds.has(id) && !aliasIds.has(id));
  if (!routeVerification.ok || missingPreviousIds.length) {
    throw new Error(`route verification failed before cache replacement (${missingPreviousIds.length} previous IDs missing)`);
  }
  await writeLegacyArticles(articles, 'public/data/provider-articles.json');
  await writeRouteAliases(aliases, 'public/data/route-aliases.json');
  globalThis.console.log(JSON.stringify({
    articles: articles.length,
    aliases: aliases.length,
    missingPreviousIds: missingPreviousIds.length,
  }));
}
