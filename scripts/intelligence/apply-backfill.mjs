import { readFile } from 'node:fs/promises';
import { entities, sources } from '../../config/intelligence-sources.mjs';
import { manifestRows } from './ingest.mjs';
import { hashReceipt, writeReceipt } from './receipt.mjs';
import { createAdminClient } from './supabase-rest.mjs';

const TABLES = [
  ['content_items', 'contentItems', 'canonical_url'],
  ['content_item_entities', 'contentItemEntities', 'content_item_id,entity_id,role'],
  ['events', 'events', 'id'],
  ['event_items', 'eventItems', 'event_id,content_item_id'],
  ['event_entities', 'eventEntities', 'event_id,entity_id,role'],
  ['route_aliases', 'routeAliases', 'legacy_id'],
];

const EXISTING_PAGE_SIZE = 1_000;

async function readExistingContentItems(client) {
  const rows = [];
  for (let offset = 0; ; offset += EXISTING_PAGE_SIZE) {
    const page = await client.selectRows('content_items', {
      select: 'id,legacy_id,source_id,canonical_url,published_at,first_seen_at',
      order: 'id.asc',
      limit: EXISTING_PAGE_SIZE,
      offset,
    });
    rows.push(...page);
    if (page.length < EXISTING_PAGE_SIZE) return rows;
  }
}

function remapContentItemReferences(bundle, existingItems) {
  const existingByUrl = new Map(existingItems.map((item) => [item.canonical_url, item]));
  const itemIdMap = new Map();
  const articleRouteIdByBundleItemId = new Map();
  const contentItems = bundle.contentItems.map((item) => {
    const existing = existingByUrl.get(item.canonical_url);
    if (!existing) {
      articleRouteIdByBundleItemId.set(item.id, item.legacy_id ?? item.id);
      return item;
    }
    itemIdMap.set(item.id, existing.id);
    articleRouteIdByBundleItemId.set(item.id, existing.legacy_id ?? existing.id);
    return {
      ...item,
      id: existing.id,
      legacy_id: existing.legacy_id ?? item.legacy_id,
      source_id: existing.source_id,
      canonical_url: existing.canonical_url,
      published_at: existing.published_at,
      first_seen_at: existing.first_seen_at,
    };
  });
  const remapId = (id) => itemIdMap.get(id) ?? id;
  return {
    ...bundle,
    contentItems,
    contentItemEntities: bundle.contentItemEntities.map((row) => ({
      ...row,
      content_item_id: remapId(row.content_item_id),
    })),
    events: bundle.events.map((row) => ({
      ...row,
      anchor_item_id: remapId(row.anchor_item_id),
    })),
    eventItems: bundle.eventItems.map((row) => ({
      ...row,
      content_item_id: remapId(row.content_item_id),
    })),
    routeAliases: bundle.routeAliases.map((row) => ({
      ...row,
      content_item_id: remapId(row.content_item_id),
      destination_path: `/article/${articleRouteIdByBundleItemId.get(row.content_item_id)}`,
    })),
  };
}

export async function applyBackfill({ bundle, manifest, client }) {
  if (bundle?.receipt?.unexplainedLossCount !== 0) {
    throw new Error('refusing to apply a backfill bundle with unexplained loss');
  }
  const { entityRows, sourceRows } = manifestRows(manifest);
  await client.upsertRows('entities', entityRows, { onConflict: 'slug' });
  await client.upsertRows('sources', sourceRows, { onConflict: 'source_key' });
  const reconciledBundle = remapContentItemReferences(
    bundle,
    await readExistingContentItems(client),
  );
  for (const [table, key, onConflict] of TABLES) {
    const rows = reconciledBundle[key];
    if (!Array.isArray(rows)) throw new Error(`backfill bundle is missing ${key}`);
    await client.upsertRows(table, rows, { onConflict });
  }
  return {
    contentItems: bundle.contentItems.length,
    routeAliases: bundle.routeAliases.length,
    events: bundle.events.length,
    bundleSha256: hashReceipt(bundle),
  };
}

function argumentValue(name) {
  const index = globalThis.process.argv.indexOf(name);
  return index === -1 ? null : globalThis.process.argv[index + 1] ?? null;
}

if (import.meta.main) {
  const bundlePath = argumentValue('--bundle');
  if (!bundlePath) throw new Error('--bundle must point to the ignored verified backfill bundle');
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
  const client = createAdminClient({
    url: globalThis.process.env.SUPABASE_URL,
    serviceRoleKey: globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  const result = await applyBackfill({ bundle, manifest: { entities, sources }, client });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const receiptPath = `docs/operations/receipts/backfill-apply-${timestamp}.json`;
  const stored = await writeReceipt(result, receiptPath);
  globalThis.console.log(JSON.stringify({ ...result, receiptPath, receiptSha256: stored.sha256 }));
}
