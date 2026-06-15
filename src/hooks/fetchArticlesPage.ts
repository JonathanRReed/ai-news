/* global AbortSignal */
import { SUPABASE_URL, SUPABASE_REST_HEADERS, supabaseConfigured } from '../lib/supabaseClient.js';
import { deriveTopics } from '../lib/articleTags.js';
import type { Article, PageData } from '../types/article.js';

export const PAGE_SIZE = 20;
const MAX_COMBINED_ROWS = PAGE_SIZE * 10;
const SUPPLEMENTAL_ARTICLES_PATH = '/data/provider-articles.json';
const SUPABASE_TIMEOUT_MS = 900;
const REST_TABLE = 'ai_company_news';
let supplementalArticlesPromise: Promise<Article[]> | null = null;
type SupabaseArticlesResult = { data: Article[]; error: Error | null };

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false;
  const article = value as Record<string, unknown>;
  return (
    typeof article.id === 'string' &&
    typeof article.company === 'string' &&
    typeof article.title === 'string' &&
    typeof article.url === 'string' &&
    typeof article.published_at === 'string'
  );
}

function articleTime(article: Article): number {
  const time = new Date(article.published_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function articleKey(article: Article): string {
  return `${article.company}:${article.url}`;
}

async function fetchSupplementalArticles(): Promise<Article[]> {
  if (supplementalArticlesPromise) return supplementalArticlesPromise;
  supplementalArticlesPromise = fetchSupplementalArticlesFromNetwork();
  return supplementalArticlesPromise;
}

async function fetchSupplementalArticlesFromNetwork(): Promise<Article[]> {
  try {
    // Default caching honours the public, max-age=300 header set on /data/* in public/_headers.
    const response = await fetch(SUPPLEMENTAL_ARTICLES_PATH);
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data.filter(isArticle) : [];
  } catch {
    return [];
  }
}

// Anonymous PostgREST read — the newest rows, optionally scoped to one company.
async function fetchSupabaseArticles(filters: ArticleFilters): Promise<SupabaseArticlesResult> {
  if (!supabaseConfigured) return { data: [], error: null };
  const params = new URLSearchParams({
    select: 'id,company,published_at,url,title,summary,source_type,content',
    order: 'published_at.desc',
    limit: String(MAX_COMBINED_ROWS),
  });
  if (filters.company && filters.company !== 'All') params.set('company', `eq.${filters.company}`);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${REST_TABLE}?${params.toString()}`, {
      headers: SUPABASE_REST_HEADERS,
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
    if (!response.ok) return { data: [], error: new Error(`Supabase responded ${response.status}`) };
    const json: unknown = await response.json();
    return { data: Array.isArray(json) ? (json as Article[]) : [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error : new Error('Supabase request failed') };
  }
}

// Cheap server-side COUNT of rows newer than `sinceMs` — no rows transferred (HEAD + count=exact).
// Topic chips are derived client-side so they can't be applied here; the banner may slightly
// over-count while a topic filter is active, which is acceptable for an advisory signal.
export async function countNewerThan(filters: ArticleFilters, sinceMs: number): Promise<number> {
  if (!supabaseConfigured || !sinceMs) return 0;
  const params = new URLSearchParams({ select: 'id', published_at: `gt.${new Date(sinceMs).toISOString()}` });
  if (filters.company && filters.company !== 'All') params.set('company', `eq.${filters.company}`);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${REST_TABLE}?${params.toString()}`, {
      method: 'HEAD',
      headers: { ...SUPABASE_REST_HEADERS, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
    const total = (response.headers.get('content-range') || '').split('/')[1];
    const count = total ? Number.parseInt(total, 10) : 0;
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

function filterArticles(articles: Article[], filters: ArticleFilters): Article[] {
  const search = filters.q?.trim().toLowerCase();
  const terms = search ? search.split(/\s+/).filter(Boolean) : [];
  const topics = filters.topics && filters.topics.length ? filters.topics : null;
  return articles.filter((article) => {
    if (filters.company && filters.company !== 'All' && article.company !== filters.company) {
      return false;
    }
    if (topics) {
      const articleTopics = deriveTopics(article);
      // OR within the topic facet: show articles matching ANY selected topic.
      if (!topics.some((topic) => articleTopics.includes(topic))) return false;
    }
    if (terms.length) {
      const haystack = `${article.title} ${article.summary ?? ''} ${article.content ?? ''}`.toLowerCase();
      // AND across query terms: every word must appear.
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

function mergeArticles(primary: Article[], supplemental: Article[]): Article[] {
  const seen = new Set<string>();
  return [...primary, ...supplemental]
    .filter((article) => {
      const key = articleKey(article);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => articleTime(b) - articleTime(a));
}

export interface ArticleFilters {
  company?: string;
  topics?: string[];
  q?: string;
}

export async function fetchArticlesPage(filters: ArticleFilters, pageParam = 0): Promise<PageData> {
  const [supabaseResult, supplementalArticles] = await Promise.all([
    fetchSupabaseArticles(filters),
    fetchSupplementalArticles(),
  ]);
  const filteredSupplemental = filterArticles(supplementalArticles, filters);
  const articles = filterArticles(mergeArticles(supabaseResult.data, filteredSupplemental), filters);

  if (supabaseResult.error && articles.length === 0) throw supabaseResult.error;

  const page = articles.slice(pageParam, pageParam + PAGE_SIZE);
  const next = articles.length > pageParam + PAGE_SIZE ? pageParam + PAGE_SIZE : undefined;
  return { data: page, next };
}
