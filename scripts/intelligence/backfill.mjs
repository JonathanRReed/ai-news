import { normalizeItem, normalizeUrl, stableRecordId } from './normalize.mjs';
import { readFile } from 'node:fs/promises';
import { entities, sources } from '../../config/intelligence-sources.mjs';
import { writeReceipt } from './receipt.mjs';
import { eventBundleForItems } from './events.mjs';

function asInput(rows, origin) {
  return rows.map((row) => ({ row, origin }));
}

function canonicalToRow(item) {
  return {
    id: item.id,
    legacy_id: item.legacy_id,
    source_id: stableRecordId('source', item.source_key),
    external_id: item.external_id,
    canonical_url: item.canonical_url,
    title: item.title,
    excerpt: item.summary || null,
    content: item.content || null,
    item_type: item.item_type,
    published_at: item.published_at,
    source_updated_at: item.source_updated_at,
    first_seen_at: item.first_seen_at,
    last_seen_at: item.last_seen_at,
    content_hash: item.content_hash,
    metadata: { ...item.metadata, backfill: true },
  };
}

function refreshMutableFields(historical, refreshed) {
  return {
    ...historical,
    title: refreshed.title,
    summary: refreshed.summary,
    content: refreshed.content,
    source_updated_at: refreshed.source_updated_at,
    last_seen_at: refreshed.last_seen_at,
    content_hash: refreshed.content_hash,
    metadata: { ...historical.metadata, ...refreshed.metadata },
  };
}

export function verifyBackfill(before, after) {
  const afterUrls = new Set(after.contentItems.map(({ canonical_url: url }) => url));
  const afterRoutes = new Set(after.routeAliases.map(({ legacy_id: id }) => id));
  const missingCanonicalUrls = [...new Set(before.validCanonicalUrls)]
    .filter((url) => !afterUrls.has(url))
    .sort();
  const missingRouteIds = [...new Set(before.routeIds)]
    .filter((id) => !afterRoutes.has(id))
    .sort();
  return {
    ok: missingCanonicalUrls.length === 0 && missingRouteIds.length === 0,
    missingCanonicalUrls,
    missingRouteIds,
    unexplainedLossCount: missingCanonicalUrls.length + missingRouteIds.length,
  };
}

export function sourceMapFromManifest(manifest) {
  const sourcesByEntitySlug = new Map();
  for (const source of manifest.sources) {
    const current = sourcesByEntitySlug.get(source.entitySlug) ?? [];
    current.push(source);
    sourcesByEntitySlug.set(source.entitySlug, current);
  }
  return new Map(manifest.entities.flatMap((entity) => {
    const matchingSources = sourcesByEntitySlug.get(entity.slug) ?? [];
    if (!matchingSources.length) return [];
    return [[entity.name, matchingSources.map((source) => ({
      ...source,
      entityName: entity.name,
    }))]];
  }));
}

function resolveSource(sourceMap, row) {
  const configured = sourceMap.get(row.company);
  if (!configured) return null;
  const candidates = Array.isArray(configured) ? configured : [configured];
  if (row.source_url) {
    let normalizedSourceUrl;
    try {
      normalizedSourceUrl = normalizeUrl(row.source_url);
    } catch {
      return null;
    }
    const exact = candidates.find((source) => normalizeUrl(source.endpointUrl) === normalizedSourceUrl);
    if (exact) return exact;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

export function buildBackfill({ legacyRows, cacheRows, sourceMap, now }) {
  const inputs = [...asInput(cacheRows, 'cache'), ...asInput(legacyRows, 'legacy')];
  const canonicalByUrl = new Map();
  const aliasTargetById = new Map();
  const quarantine = [];
  const collisions = [];
  const admittedCanonicalUrls = new Set();

  for (const { row, origin } of inputs) {
    const source = resolveSource(sourceMap, row);
    if (!source) {
      quarantine.push({ origin, id: row.id ?? null, reason: `no admitted source for ${row.company}` });
      continue;
    }

    let canonical;
    try {
      canonical = normalizeItem({
        ...row,
        legacy_id: row.id,
        canonical_url: row.url,
      }, source, { now });
    } catch (error) {
      quarantine.push({
        origin,
        id: row.id ?? null,
        reason: error instanceof Error ? error.message : 'normalization failed',
      });
      continue;
    }

    const historical = canonicalByUrl.get(canonical.canonical_url);
    admittedCanonicalUrls.add(canonical.canonical_url);
    canonicalByUrl.set(
      canonical.canonical_url,
      historical ? refreshMutableFields(historical, canonical) : canonical,
    );

    if (typeof row.id === 'string' && row.id) {
      const existingTarget = aliasTargetById.get(row.id);
      if (existingTarget && existingTarget !== canonical.canonical_url) {
        collisions.push({ id: row.id, firstUrl: existingTarget, conflictingUrl: canonical.canonical_url });
      } else {
        aliasTargetById.set(row.id, canonical.canonical_url);
      }
    }
  }

  const canonicalItems = [...canonicalByUrl.values()]
    .sort((left, right) => (
      Date.parse(right.published_at) - Date.parse(left.published_at) || right.id.localeCompare(left.id)
    ));
  const itemIdByUrl = new Map(canonicalItems.map((item) => [item.canonical_url, item.id]));
  const routeIdByUrl = new Map(canonicalItems.map((item) => [
    item.canonical_url,
    item.legacy_id || item.id,
  ]));
  const routeAliases = [...aliasTargetById.entries()]
    .map(([legacyId, url]) => ({
      legacy_id: legacyId,
      content_item_id: itemIdByUrl.get(url),
      destination_path: `/article/${routeIdByUrl.get(url)}`,
    }))
    .filter(({ content_item_id: contentItemId }) => Boolean(contentItemId))
    .sort((left, right) => left.legacy_id.localeCompare(right.legacy_id));
  const contentItemEntities = canonicalItems.map((item) => ({
    content_item_id: item.id,
    entity_id: stableRecordId('entity', item.entity_slug),
    role: 'publisher',
  }));
  const contentItems = canonicalItems.map(canonicalToRow);
  const events = [];
  const eventItems = [];
  const eventEntities = [];
  for (const item of canonicalItems) {
    const bundle = eventBundleForItems([item], {
      sourceName: item.source_key,
      entityId: stableRecordId('entity', item.entity_slug),
    });
    events.push(...bundle.events);
    eventItems.push(...bundle.eventItems);
    eventEntities.push(...bundle.eventEntities);
  }

  const before = {
    validCanonicalUrls: [...admittedCanonicalUrls].sort(),
    routeIds: [...aliasTargetById.keys()],
  };
  const verification = verifyBackfill(before, { contentItems, routeAliases });
  const unexplainedLossCount = verification.unexplainedLossCount + collisions.length;

  return {
    contentItems,
    contentItemEntities,
    events,
    eventItems,
    eventEntities,
    routeAliases,
    quarantine,
    collisions,
    receipt: {
      cacheRowCount: cacheRows.length,
      legacyRowCount: legacyRows.length,
      validCanonicalUrlCount: before.validCanonicalUrls.length,
      contentItemCount: contentItems.length,
      routeAliasCount: routeAliases.length,
      quarantineCount: quarantine.length,
      legacyIdCollisionCount: collisions.length,
      unexplainedLossCount,
      missingCanonicalUrls: verification.missingCanonicalUrls,
      missingRouteIds: verification.missingRouteIds,
    },
  };
}

function argumentValue(name) {
  const index = globalThis.process.argv.indexOf(name);
  return index === -1 ? null : globalThis.process.argv[index + 1] ?? null;
}

if (import.meta.main) {
  const legacyPath = argumentValue('--legacy');
  const cachePath = argumentValue('--cache') ?? 'public/data/provider-articles.json';
  if (!legacyPath) throw new Error('--legacy must point to the ignored public Supabase export');
  const [legacyRows, cacheRows] = await Promise.all([
    readFile(legacyPath, 'utf8').then(JSON.parse),
    readFile(cachePath, 'utf8').then(JSON.parse),
  ]);
  const bundle = buildBackfill({
    legacyRows,
    cacheRows,
    sourceMap: sourceMapFromManifest({ entities, sources }),
    now: new Date().toISOString(),
  });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const path = `docs/operations/receipts/backfill-${timestamp}.json`;
  const stored = await writeReceipt(bundle, path);
  globalThis.console.log(JSON.stringify({ receipt: bundle.receipt, path, sha256: stored.sha256 }));
  if (bundle.receipt.unexplainedLossCount > 0) globalThis.process.exitCode = 1;
}
