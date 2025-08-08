import { supabase } from '../lib/supabaseClient.js';

export const PAGE_SIZE = 20;

export interface ArticleFilters {
  category?: string;
  company?: string;
  q?: string;
}

export async function fetchArticlesPage(filters: ArticleFilters, pageParam = 0) {
  let q = supabase
    .from('ai_company_news')
    .select('*')
    .order('published_at', { ascending: false })
    .range(pageParam, pageParam + PAGE_SIZE - 1);

  if (filters.category && filters.category !== 'All')
    q = q.eq('source_type', filters.category);
  if (filters.company && filters.company !== 'All')
    q = q.eq('company', filters.company);
  if (filters.q && filters.q.trim() !== '') {
    const pattern = `%${filters.q.trim()}%`;
    q = q.or(`title.ilike.${pattern},summary.ilike.${pattern}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const articles = Array.isArray(data) ? data : [];
  const next = articles.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined;
  return { data: articles, next };
}
