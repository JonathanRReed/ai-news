import { supabase } from '../lib/supabaseClient.js';
import type { Database } from '../types/database.js';
import type { Article, PageData } from '../types/article.js';

export const PAGE_SIZE = 20;
const MAX_COMBINED_ROWS = PAGE_SIZE * 10;
const SUPPLEMENTAL_ARTICLES_PATH = '/data/provider-articles.json';
const SUPABASE_TIMEOUT_MS = 900;
type NewsSourceType = Database['public']['Enums']['news_source_type'];
const NEWS_SOURCE_TYPES = ['rss_official', 'rss_unofficial', 'scraped'] as const satisfies readonly NewsSourceType[];
type SupabaseArticlesResult = { data: Article[]; error: Error | null };

function isNewsSourceType(value: string): value is NewsSourceType {
  return NEWS_SOURCE_TYPES.some((sourceType) => sourceType === value);
}

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
  try {
    const response = await fetch(SUPPLEMENTAL_ARTICLES_PATH, { cache: 'no-store' });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data.filter(isArticle) : [];
  } catch {
    return [];
  }
}

function filterSupplementalArticles(articles: Article[], filters: ArticleFilters): Article[] {
  const search = filters.q?.trim().toLowerCase();
  return articles.filter((article) => {
    if (filters.category && filters.category !== 'All' && isNewsSourceType(filters.category)) {
      if (article.source_type !== filters.category) return false;
    }

    if (filters.company && filters.company !== 'All' && article.company !== filters.company) {
      return false;
    }

    if (search) {
      const haystack = `${article.title} ${article.summary ?? ''} ${article.content ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
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

function timeoutSupabase(): Promise<SupabaseArticlesResult> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      resolve({ data: [], error: new Error('Supabase request timed out.') });
    }, SUPABASE_TIMEOUT_MS);
  });
}

export interface ArticleFilters {
  category?: string;
  company?: string;
  q?: string;
}

export async function fetchArticlesPage(filters: ArticleFilters, pageParam = 0): Promise<PageData> {
  let q = supabase
    .from('ai_company_news')
    .select('id, company, published_at, url, title, summary, source_type, content')
    .order('published_at', { ascending: false })
    .range(0, MAX_COMBINED_ROWS - 1);

  if (filters.category && filters.category !== 'All' && isNewsSourceType(filters.category))
    q = q.eq('source_type', filters.category);
  if (filters.company && filters.company !== 'All')
    q = q.eq('company', filters.company);
  if (filters.q && filters.q.trim() !== '') {
    const pattern = `%${filters.q.trim()}%`;
    q = q.or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern}`);
  }

  const supabaseArticles = Promise.resolve(q)
    .then(({ data, error }) => ({
      data: Array.isArray(data) ? data as Article[] : [],
      error: error ? new Error(error.message) : null,
    }))
    .catch((error: Error) => ({ data: [], error }));

  const [supabaseResult, supplementalArticles] = await Promise.all([
    Promise.race([supabaseArticles, timeoutSupabase()]),
    fetchSupplementalArticles(),
  ]);
  const filteredSupplemental = filterSupplementalArticles(supplementalArticles, filters);
  const articles = mergeArticles(supabaseResult.data, filteredSupplemental);

  if (supabaseResult.error && articles.length === 0) throw supabaseResult.error;

  const page = articles.slice(pageParam, pageParam + PAGE_SIZE);
  const next = articles.length > pageParam + PAGE_SIZE ? pageParam + PAGE_SIZE : undefined;
  return { data: page, next };
}
