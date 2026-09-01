/* global AbortSignal */
import { SUPABASE_URL, SUPABASE_REST_HEADERS, supabaseConfigured } from '../lib/supabaseClient.js';
import { toArticle } from '../lib/articleCompatibility.js';
import { admittedArticles } from '../lib/articleAdmission.js';
import { fetchIntelligencePage, isKnownCompanyName } from '../lib/intelligenceClient.js';
import type { IntelligenceFilters } from '../lib/intelligenceClient.js';
import type { Article, PageData } from '../types/article.js';
import type { FeedCursor } from '../types/intelligence.js';

export const PAGE_SIZE = 20;
const SUPPLEMENTAL_ARTICLES_PATH = '/data/provider-feed.json';
const SUPABASE_TIMEOUT_MS = 2_500;
const REST_VIEW = 'intelligence_feed_v1';
let supplementalArticlesPromise: Promise<Article[]> | null = null;

export type ArticleFilters = IntelligenceFilters;

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false;
  const article = value as Record<string, unknown>;
  return (
    typeof article.id === 'string'
    && typeof article.company === 'string'
    && typeof article.title === 'string'
    && typeof article.url === 'string'
    && typeof article.published_at === 'string'
  );
}
async function fetchSupplementalArticles(): Promise<Article[]> {
  if (supplementalArticlesPromise) return supplementalArticlesPromise;
  supplementalArticlesPromise = (async () => {
    try {
      const response = await fetch(SUPPLEMENTAL_ARTICLES_PATH);
      if (!response.ok) return [];
      const data: unknown = await response.json();
      return Array.isArray(data) ? admittedArticles(data.filter(isArticle)) : [];
    } catch {
      return [];
    }
  })();
  return supplementalArticlesPromise;
}

export async function countNewerThan(filters: ArticleFilters, sinceMs: number): Promise<number> {
  if (!supabaseConfigured || !sinceMs) return 0;
  if (!isKnownCompanyName(filters.company)) return 0;
  const params = new URLSearchParams({
    select: 'id',
    published_at: `gt.${new Date(sinceMs).toISOString()}`,
  });
  if (filters.company && filters.company !== 'All') {
    params.set('entity_name', `eq.${filters.company}`);
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${REST_VIEW}?${params}`, {
      method: 'HEAD',
      headers: { ...SUPABASE_REST_HEADERS, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
    const total = (response.headers.get('content-range') || '').split('/')[1];
    const count = total ? Number.parseInt(total, 10) : 0;
    return response.ok && Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

export async function fetchArticlesPage(
  filters: ArticleFilters,
  pageParam: FeedCursor | null = null,
): Promise<PageData> {
  const staticArticles = await fetchSupplementalArticles();
  const page = await fetchIntelligencePage(filters, pageParam, {
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_REST_HEADERS.apikey,
    staticArticles,
    pageSize: PAGE_SIZE,
    timeoutMs: SUPABASE_TIMEOUT_MS,
  });
  if (page.state === 'degraded' && page.data.length === 0) {
    throw new Error('The live feed and verified cache are unavailable');
  }
  return {
    data: admittedArticles(page.data.map(toArticle)),
    next: page.nextCursor ?? undefined,
    state: page.state,
    cacheFreshness: page.cacheFreshness,
  };
}
