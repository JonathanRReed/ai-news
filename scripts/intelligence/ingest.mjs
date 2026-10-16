import { entities, sources } from '../../config/intelligence-sources.mjs';
import { fetchSource } from './fetch-source.mjs';
import { eventBundleForItems } from './events.mjs';
import { normalizeItem, stableRecordId } from './normalize.mjs';
import { hashReceipt, writeReceipt } from './receipt.mjs';
import { sourceAdmissionHosts } from './source-policy.mjs';
import { createAdminClient } from './supabase-rest.mjs';

const EXISTING_CONTENT_PAGE_SIZE = 1_000;

function isoDate(value) {
  const date = new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error('now must be a valid date');
  return date.toISOString();
}

function verifiedAt(value) {
  return isoDate(value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

export function manifestRows(manifest) {
  const entityIdBySlug = new Map();
  const entityRows = manifest.entities.map((entity) => {
    const id = stableRecordId('entity', entity.slug);
    entityIdBySlug.set(entity.slug, id);
    return {
      id,
      slug: entity.slug,
      name: entity.name,
      entity_type: entity.entityType,
      status: entity.status,
      homepage_url: entity.homepageUrl || null,
      summary: entity.summary || null,
      metadata: {},
    };
  });

  const sourceRows = manifest.sources.map((source) => {
    const entityId = entityIdBySlug.get(source.entitySlug);
    if (!entityId) throw new Error(`source ${source.sourceKey} references a missing entity`);
    const allowedHosts = sourceAdmissionHosts(source);
    return {
      id: stableRecordId('source', source.sourceKey),
      source_key: source.sourceKey,
      entity_id: entityId,
      name: source.name,
      official_url: source.officialUrl,
      endpoint_url: source.endpointUrl,
      allowed_hosts: allowedHosts,
      transport_type: source.transportType,
      source_role: source.sourceRole,
      parser_key: source.parserKey,
      active: source.active,
      required: source.required,
      verified_at: verifiedAt(source.verifiedAt),
      metadata: {
        allowed_hosts: allowedHosts,
        archive_only: source.archiveOnly ?? false,
        include_paths: source.includePaths ?? [],
        source_type: source.sourceType,
        item_type: source.itemType,
      },
    };
  });

  return { entityRows, sourceRows, entityIdBySlug };
}

function contentRow(item, sourceId) {
  return {
    id: item.id,
    legacy_id: item.legacy_id,
    source_id: sourceId,
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
    metadata: item.metadata,
  };
}

async function readExistingContentItems(client) {
  const rows = [];
  for (let offset = 0; ; offset += EXISTING_CONTENT_PAGE_SIZE) {
    const page = await client.selectRows('content_items', {
      select: 'id,legacy_id,source_id,canonical_url,published_at,first_seen_at',
      order: 'id.asc',
      limit: EXISTING_CONTENT_PAGE_SIZE,
      offset,
    });
    rows.push(...page);
    if (page.length < EXISTING_CONTENT_PAGE_SIZE) return rows;
  }
}

function preserveExistingIdentity(item, existing) {
  if (!existing) return item;
  return {
    ...item,
    id: existing.id,
    legacy_id: existing.legacy_id ?? item.legacy_id,
    published_at: existing.published_at,
    first_seen_at: existing.first_seen_at,
  };
}

function uniqueByCanonicalUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.canonical_url)) return false;
    seen.add(item.canonical_url);
    return true;
  });
}

function statusFromResults(results) {
  const failed = results.filter(({ status }) => status === 'failed');
  if (!failed.length) return 'success';
  return failed.some(({ required }) => required) ? 'failed' : 'partial';
}

function maxPublishedAt(items) {
  return items.reduce((latest, item) => (
    !latest || Date.parse(item.published_at) > Date.parse(latest) ? item.published_at : latest
  ), null);
}

export async function runIngestion({
  manifest,
  client,
  fetchImpl = globalThis.fetch,
  fetchSourceImpl = fetchSource,
  now,
  clock = () => new Date(),
  triggerSource = 'manual',
}) {
  const startedAt = isoDate(now ?? clock());
  const activeSources = manifest.sources.filter(({ active }) => active);
  const { entityRows, sourceRows, entityIdBySlug } = manifestRows(manifest);
  const sourceRowByKey = new Map(sourceRows.map((source) => [source.source_key, source]));
  const entityBySlug = new Map(manifest.entities.map((entity) => [entity.slug, entity]));

  await client.upsertRows('entities', entityRows, { onConflict: 'slug' });
  await client.upsertRows('sources', sourceRows, { onConflict: 'source_key' });

  const existingSourceRows = await client.selectRows('sources', {
    select: 'id,source_key,etag,last_modified,consecutive_failures,last_success_at,last_item_at',
  });
  const existingByKey = new Map(existingSourceRows.map((source) => [source.source_key, source]));
  const existingContentByUrl = new Map(
    (await readExistingContentItems(client)).map((item) => [item.canonical_url, item]),
  );
  const runId = await client.rpc('start_intelligence_ingestion', {
    p_trigger_source: triggerSource,
    p_source_count: activeSources.length,
    p_metadata: { manifest_entities: entityRows.length, manifest_sources: sourceRows.length },
  });
  const results = [];

  for (const source of activeSources) {
    const sourceRow = sourceRowByKey.get(source.sourceKey);
    const entity = entityBySlug.get(source.entitySlug);
    const previous = existingByKey.get(source.sourceKey) ?? {};
    let fetchResult;
    try {
      fetchResult = await fetchSourceImpl(source, {
        fetchImpl,
        previousState: {
          etag: previous.etag ?? null,
          lastModified: previous.last_modified ?? null,
        },
        now: startedAt,
      });
    } catch {
      fetchResult = {
        status: 'failed',
        items: [],
        httpStatus: null,
        fetchedAt: startedAt,
        etag: null,
        lastModified: null,
        error: 'source adapter failed',
      };
    }

    let normalizedItems = [];
    if (fetchResult.status === 'success') {
      try {
        const canonicalItems = uniqueByCanonicalUrl(fetchResult.items.map((item) => normalizeItem(item, {
          ...source,
          entityName: entity.name,
        }, { now: startedAt })));
        normalizedItems = canonicalItems.map((item) => preserveExistingIdentity(
          item,
          existingContentByUrl.get(item.canonical_url),
        ));
        const storedIdByCanonicalId = new Map(canonicalItems.map((item, index) => (
          [item.id, normalizedItems[index].id]
        )));
        const itemRows = normalizedItems.map((item) => contentRow(
          item,
          existingContentByUrl.get(item.canonical_url)?.source_id ?? sourceRow.id,
        ));
        await client.upsertRows('content_items', itemRows, { onConflict: 'canonical_url' });
        for (const itemRow of itemRows) {
          existingContentByUrl.set(itemRow.canonical_url, itemRow);
        }
        await client.upsertRows(
          'content_item_entities',
          normalizedItems.map((item) => ({
            content_item_id: item.id,
            entity_id: entityIdBySlug.get(source.entitySlug),
            role: 'publisher',
          })),
          { onConflict: 'content_item_id,entity_id,role' },
        );
        const eventBundle = eventBundleForItems(canonicalItems, {
          sourceName: source.name,
          entityId: entityIdBySlug.get(source.entitySlug),
        });
        const eventRows = eventBundle.events.map((event) => ({
          ...event,
          anchor_item_id: storedIdByCanonicalId.get(event.anchor_item_id),
        }));
        const eventItemRows = eventBundle.eventItems.map((eventItem) => ({
          ...eventItem,
          content_item_id: storedIdByCanonicalId.get(eventItem.content_item_id),
        }));
        await client.upsertRows('events', eventRows, { onConflict: 'id' });
        await client.upsertRows('event_items', eventItemRows, {
          onConflict: 'event_id,content_item_id',
        });
        await client.upsertRows('event_entities', eventBundle.eventEntities, {
          onConflict: 'event_id,entity_id,role',
        });
      } catch {
        fetchResult = { ...fetchResult, status: 'failed', error: 'item normalization or write failed' };
        normalizedItems = [];
      }
    }

    const completedAt = isoDate(fetchResult.fetchedAt ?? startedAt);
    const status = fetchResult.status;
    const sourceResult = {
      sourceKey: source.sourceKey,
      required: source.required,
      status,
      httpStatus: fetchResult.httpStatus ?? null,
      itemCount: normalizedItems.length,
      error: fetchResult.error ?? null,
    };
    results.push(sourceResult);

    const healthPatch = {
      last_checked_at: completedAt,
      etag: fetchResult.etag ?? previous.etag ?? null,
      last_modified: fetchResult.lastModified ?? previous.last_modified ?? null,
      consecutive_failures: status === 'failed' ? (previous.consecutive_failures ?? 0) + 1 : 0,
    };
    if (status !== 'failed') {
      healthPatch.last_success_at = completedAt;
      healthPatch.last_item_at = maxPublishedAt(normalizedItems) ?? previous.last_item_at ?? null;
    }
    await client.patchRows('sources', { id: `eq.${sourceRow.id}` }, healthPatch);
    await client.rpc('record_intelligence_source_run', {
      p_ingestion_run_id: runId,
      p_source_id: sourceRow.id,
      p_started_at: startedAt,
      p_completed_at: completedAt,
      p_status: status,
      p_http_status: fetchResult.httpStatus ?? null,
      p_item_count: normalizedItems.length,
      p_etag: fetchResult.etag ?? null,
      p_last_modified: fetchResult.lastModified ?? null,
      p_sanitized_error: fetchResult.error ?? null,
      p_metadata: {},
    });
  }

  const status = statusFromResults(results);
  const counts = {
    sources: results.length,
    succeeded: results.filter(({ status: sourceStatus }) => sourceStatus !== 'failed').length,
    failed: results.filter(({ status: sourceStatus }) => sourceStatus === 'failed').length,
    items: results.reduce((total, source) => total + source.itemCount, 0),
  };
  const completedAt = isoDate(clock());
  const receipt = {
    runId,
    startedAt,
    completedAt,
    status,
    counts,
    requiredFailures: results
      .filter((source) => source.required && source.status === 'failed')
      .map(({ sourceKey }) => sourceKey),
    sources: results,
  };
  const sha256 = hashReceipt(receipt);
  await client.rpc('finish_intelligence_ingestion', {
    p_ingestion_run_id: runId,
    p_completed_at: completedAt,
    p_status: status,
    p_succeeded_count: counts.succeeded,
    p_failed_count: counts.failed,
    p_item_count: counts.items,
    p_receipt_sha256: sha256,
    p_metadata: {},
  });
  return receipt;
}

if (import.meta.main) {
  const url = globalThis.process.env.SUPABASE_URL;
  const serviceRoleKey = globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createAdminClient({ url, serviceRoleKey });
  const receipt = await runIngestion({ manifest: { entities, sources }, client });
  const timestamp = receipt.completedAt.replaceAll(':', '-');
  const path = `docs/operations/receipts/ingestion-${timestamp}.json`;
  const stored = await writeReceipt(receipt, path);
  globalThis.console.log(JSON.stringify({ status: receipt.status, counts: receipt.counts, receipt: stored }));
  if (receipt.status === 'failed') globalThis.process.exitCode = 1;
}
