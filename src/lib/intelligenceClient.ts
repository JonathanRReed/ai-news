/* global AbortSignal */
import { deriveTopics } from './articleTags.js';
import { sourceKeyForArticle } from './articleAdmission.js';
import { intelligenceEntities } from './intelligenceCatalog.js';
import type { Article } from '../types/article.js';
import type { FeedCursor, FeedItem, FeedPage } from '../types/intelligence.js';

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT_MS = 2_500;
export const MAX_SEARCH_QUERY_LENGTH = 160;
export const MAX_SEARCH_TERMS = 8;
export const MAX_SEARCH_TERM_LENGTH = 48;
const LIVE_SELECT = [
  'id',
  'legacy_id',
  'canonical_url',
  'title',
  'excerpt',
  'content',
  'item_type',
  'published_at',
  'source_key',
  'source_name',
  'source_url',
  'source_type',
  'entity_id',
  'entity_slug',
  'entity_name',
  'entity_type',
  'event_id',
  'event_slug',
  'event_title',
  'event_significance',
  'significance_reason',
].join(',');

export interface IntelligenceFilters {
  company?: string;
  topics?: string[];
  q?: string;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface IntelligenceDependencies {
  supabaseUrl: string;
  anonKey: string;
  staticArticles: Article[];
  fetchImpl?: FetchLike;
  pageSize?: number;
  timeoutMs?: number;
}

export function normalizeSearchQuery(value = ''): string {
  const boundedInput = String(value).slice(0, MAX_SEARCH_QUERY_LENGTH * 4);
  const withoutControlCharacters = [...boundedInput].map((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? ' ' : character;
  }).join('');
  return withoutControlCharacters
    .replace(/[,%().*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH)
    .trim();
}

export function boundedSearchTerms(value = ''): string[] {
  return normalizeSearchQuery(value)
    .toLocaleLowerCase('en-US')
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.slice(0, MAX_SEARCH_TERM_LENGTH))
    .slice(0, MAX_SEARCH_TERMS);
}

export function isKnownCompanyName(
  value: string | undefined,
  staticArticles: Article[] = [],
): boolean {
  if (!value || value === 'All') return true;
  const known = new Set([
    ...intelligenceEntities.map(({ name }) => name),
    ...staticArticles.map(({ company }) => company),
  ]);
  return known.has(value);
}

function isFeedItem(value: unknown): value is FeedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string'
    && (typeof item.legacy_id === 'string' || item.legacy_id === null)
    && typeof item.canonical_url === 'string'
    && typeof item.title === 'string'
    && (typeof item.excerpt === 'string' || item.excerpt === null)
    && (typeof item.content === 'string' || item.content === null)
    && typeof item.item_type === 'string'
    && typeof item.published_at === 'string'
    && typeof item.entity_name === 'string'
    && typeof item.entity_slug === 'string'
    && typeof item.entity_type === 'string'
    && typeof item.source_key === 'string'
    && typeof item.source_name === 'string'
    && typeof item.source_url === 'string'
    && typeof item.source_type === 'string'
  );
}

function staticFeedItem(article: Article): FeedItem {
  return {
    id: article.id,
    legacy_id: article.id,
    canonical_url: article.url,
    title: article.title,
    excerpt: article.summary ?? null,
    content: article.content ?? null,
    item_type: 'other',
    published_at: article.published_at,
    source_key: article.source_key
      ?? sourceKeyForArticle(article)
      ?? `cache-${article.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    source_name: article.company,
    source_url: article.source_url ?? article.url,
    source_type: article.source_type ?? 'rss_official',
    entity_id: '',
    entity_slug: article.company.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    entity_name: article.company,
    entity_type: 'provider',
    event_id: null,
    event_slug: null,
    event_title: null,
    event_significance: null,
    significance_reason: null,
  };
}

function compareTuple(left: { published_at: string; id: string }, right: FeedCursor) {
  const dateOrder = Date.parse(right.publishedAt) - Date.parse(left.published_at);
  if (dateOrder !== 0) return dateOrder;
  return right.id.localeCompare(left.id);
}

function matchesFilters(item: FeedItem, filters: IntelligenceFilters) {
  if (filters.company && filters.company !== 'All' && item.entity_name !== filters.company) return false;
  const terms = boundedSearchTerms(filters.q);
  const haystack = `${item.title} ${item.excerpt ?? ''} ${item.content ?? ''}`.toLowerCase();
  if (terms.some((term) => !haystack.includes(term))) return false;
  if (filters.topics?.length) {
    const topics = deriveTopics({
      title: item.title,
      summary: item.excerpt ?? undefined,
      content: item.content ?? undefined,
    });
    if (!filters.topics.some((topic) => topics.includes(topic))) return false;
  }
  return true;
}

function matchesLiveTopics(item: FeedItem, filters: IntelligenceFilters) {
  if (!filters.topics?.length) return true;
  const topics = deriveTopics({
    title: item.title,
    summary: item.excerpt ?? undefined,
    content: item.content ?? undefined,
  });
  return filters.topics.some((topic) => topics.includes(topic));
}

function cursorFilter(cursor: FeedCursor) {
  return `(${[
    `published_at.lt.${cursor.publishedAt}`,
    `and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`,
  ].join(',')})`;
}

function qFilter(value = '') {
  const terms = boundedSearchTerms(value);
  if (!terms.length) return null;
  return `(${terms.map((term) => (
    `or(title.ilike.*${term}*,excerpt.ilike.*${term}*,content.ilike.*${term}*)`
  )).join(',')})`;
}

function cacheFreshness(items: FeedItem[]) {
  return items.reduce<string | null>((latest, item) => (
    !latest || Date.parse(item.published_at) > Date.parse(latest) ? item.published_at : latest
  ), null);
}

function staticPage(
  filters: IntelligenceFilters,
  cursor: FeedCursor | null,
  dependencies: IntelligenceDependencies,
  state: FeedPage['state'],
): FeedPage {
  const pageSize = dependencies.pageSize ?? PAGE_SIZE;
  const all = dependencies.staticArticles
    .map(staticFeedItem)
    .sort((left, right) => (
      Date.parse(right.published_at) - Date.parse(left.published_at) || right.id.localeCompare(left.id)
    ));
  const eligible = all
    .filter((item) => !cursor || compareTuple(item, cursor) > 0)
    .filter((item) => matchesFilters(item, filters));
  const data = eligible.slice(0, pageSize);
  const last = data.at(-1);
  return {
    data,
    nextCursor: eligible.length > pageSize && last
      ? { publishedAt: last.published_at, id: last.id }
      : null,
    state,
    cacheFreshness: cacheFreshness(all),
  };
}

async function livePage(
  filters: IntelligenceFilters,
  cursor: FeedCursor | null,
  dependencies: IntelligenceDependencies,
): Promise<FeedPage> {
  const pageSize = dependencies.pageSize ?? PAGE_SIZE;
  const scanLimit = filters.topics?.length ? Math.min(pageSize * 5 + 1, 1000) : pageSize + 1;
  const params = new URLSearchParams({
    select: LIVE_SELECT,
    order: 'published_at.desc,id.desc',
    limit: String(scanLimit),
  });
  if (filters.company && filters.company !== 'All') params.set('entity_name', `eq.${filters.company}`);
  if (cursor) params.set('or', cursorFilter(cursor));
  const searchFilter = qFilter(filters.q);
  if (searchFilter) params.set('and', searchFilter);
  const url = `${dependencies.supabaseUrl}/rest/v1/intelligence_feed_v1?${params}`;
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const response = await fetchImpl(url, {
    headers: {
      apikey: dependencies.anonKey,
      Authorization: `Bearer ${dependencies.anonKey}`,
    },
    signal: AbortSignal.timeout(dependencies.timeoutMs ?? REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`live feed responded ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isFeedItem)) {
    throw new Error('live feed returned an invalid payload');
  }
  const matching = payload.filter((item) => matchesLiveTopics(item, filters));
  const data = matching.slice(0, pageSize);
  let cursorRow: FeedItem | undefined;
  if (matching.length > pageSize) cursorRow = matching[pageSize - 1];
  else if (payload.length === scanLimit) cursorRow = payload.at(-1);
  return {
    data,
    nextCursor: cursorRow ? { publishedAt: cursorRow.published_at, id: cursorRow.id } : null,
    state: 'live',
    cacheFreshness: null,
  };
}

export async function fetchIntelligencePage(
  filters: IntelligenceFilters,
  cursor: FeedCursor | null,
  dependencies: IntelligenceDependencies,
): Promise<FeedPage> {
  if (!isKnownCompanyName(filters.company, dependencies.staticArticles)) {
    return staticPage(filters, cursor, dependencies, 'static');
  }
  if (!dependencies.supabaseUrl || !dependencies.anonKey) {
    return staticPage(filters, cursor, dependencies, 'unconfigured');
  }
  try {
    return await livePage(filters, cursor, dependencies);
  } catch {
    return staticPage(filters, cursor, dependencies, 'degraded');
  }
}
