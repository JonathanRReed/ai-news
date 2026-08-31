import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { admittedHttpsUrl } from './source-policy.mjs';

const TRACKING_PARAMETERS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'msclkid',
]);

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function requireText(value, label) {
  const text = cleanText(value);
  if (!text) throw new Error(`${label} must be a non-empty string`);
  return text;
}

function normalizeDate(value, label) {
  const date = new Date(typeof value === 'string' || typeof value === 'number' ? value : '');
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid publication date`);
  return date.toISOString();
}

function optionalDate(value, label) {
  if (value === null || value === undefined || value === '') return null;
  return normalizeDate(value, label);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function deterministicUuid(value) {
  const bytes = Buffer.from(sha256(value).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-');
}

export function stableRecordId(namespace, value) {
  const normalizedNamespace = requireText(namespace, 'namespace');
  const normalizedValue = requireText(value, 'value');
  return deterministicUuid(`${normalizedNamespace}:${normalizedValue}`);
}

function isTrackingParameter(name) {
  const normalized = name.toLowerCase();
  return normalized.startsWith('utm_') || TRACKING_PARAMETERS.has(normalized);
}

export function normalizeUrl(value) {
  const raw = requireText(value, 'URL');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL must be a valid HTTP or HTTPS URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw new Error('URL must not contain credentials');
  }

  const retainedParameters = [...url.searchParams.entries()]
    .filter(([name]) => !isTrackingParameter(name))
    .sort(([leftName, leftValue], [rightName, rightValue]) => {
      return leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue);
    });

  url.hash = '';
  url.search = '';
  for (const [name, parameterValue] of retainedParameters) {
    url.searchParams.append(name, parameterValue);
  }
  return url.toString();
}

export function stableItemId(sourceKey, canonicalUrl) {
  const normalizedSourceKey = requireText(sourceKey, 'sourceKey');
  const normalizedUrl = normalizeUrl(canonicalUrl);
  return stableRecordId(`item:${normalizedSourceKey}`, normalizedUrl);
}

export function normalizeItem(input, source, options = {}) {
  if (!input || typeof input !== 'object') throw new Error('Source item must be an object');
  if (!source || typeof source !== 'object') throw new Error('Source definition must be an object');

  const sourceKey = requireText(source.sourceKey, 'sourceKey');
  const entitySlug = requireText(source.entitySlug, 'entitySlug');
  const entityName = requireText(source.entityName, 'entityName');
  const canonicalUrl = normalizeUrl(
    admittedHttpsUrl(source, input.canonical_url ?? input.url).toString(),
  );
  const title = requireText(input.title, 'title');
  const publishedAt = normalizeDate(
    input.published_at ?? input.publishedAt ?? input.pubDate,
    'published_at',
  );
  const now = normalizeDate(options.now ?? new Date().toISOString(), 'now');
  const summary = cleanText(input.summary ?? input.excerpt);
  const content = cleanText(input.content);
  const legacyId = cleanText(input.legacy_id ?? input.id) || null;
  const sourceUrl = normalizeUrl(
    admittedHttpsUrl(source, input.source_url ?? source.endpointUrl ?? source.officialUrl).toString(),
  );
  const sourceType = cleanText(input.source_type ?? source.sourceType) || 'rss_official';
  const itemType = cleanText(input.item_type ?? source.itemType) || 'other';
  const externalId = cleanText(input.external_id ?? input.externalId) || null;
  const firstSeenAt = optionalDate(input.first_seen_at, 'first_seen_at') ?? now;
  const lastSeenAt = optionalDate(input.last_seen_at, 'last_seen_at') ?? now;
  const sourceUpdatedAt = optionalDate(
    input.source_updated_at ?? input.updated_at ?? input.updatedAt,
    'source_updated_at',
  );
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
    ? { ...input.metadata }
    : {};

  return {
    id: stableItemId(sourceKey, canonicalUrl),
    legacy_id: legacyId,
    source_key: sourceKey,
    entity_slug: entitySlug,
    entity_name: entityName,
    external_id: externalId,
    canonical_url: canonicalUrl,
    title,
    summary,
    content,
    item_type: itemType,
    published_at: publishedAt,
    source_updated_at: sourceUpdatedAt,
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt,
    content_hash: sha256(`${title}\n${summary}\n${content}`),
    source_type: sourceType,
    source_url: sourceUrl,
    metadata,
  };
}

export function compareCanonicalItems(left, right) {
  const dateOrder = Date.parse(right.published_at) - Date.parse(left.published_at);
  return dateOrder || right.id.localeCompare(left.id);
}

function mergeRefreshedItem(historical, refreshed) {
  return {
    ...historical,
    ...refreshed,
    id: historical.id,
    legacy_id: historical.legacy_id ?? refreshed.legacy_id ?? null,
    source_key: historical.source_key ?? refreshed.source_key,
    canonical_url: historical.canonical_url,
    published_at: historical.published_at,
    first_seen_at: historical.first_seen_at ?? refreshed.first_seen_at,
  };
}

export function mergeCanonicalItems(fresh, existing) {
  const merged = new Map();

  for (const item of existing) {
    if (!item?.canonical_url) continue;
    if (!merged.has(item.canonical_url)) merged.set(item.canonical_url, { ...item });
  }

  for (const item of fresh) {
    if (!item?.canonical_url) continue;
    const historical = merged.get(item.canonical_url);
    merged.set(
      item.canonical_url,
      historical ? mergeRefreshedItem(historical, item) : { ...item },
    );
  }

  return [...merged.values()].sort(compareCanonicalItems);
}

export function toLegacyArticle(item) {
  return {
    id: item.legacy_id || item.id,
    company: item.entity_name,
    title: item.title,
    url: item.canonical_url,
    published_at: item.published_at,
    source_type: item.source_type,
    summary: item.summary,
    content: item.content,
    source_url: item.source_url,
  };
}
