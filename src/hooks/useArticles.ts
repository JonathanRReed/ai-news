import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';
import type { Article, PageData } from '../types/article.js';

export const PAGE_SIZE = 20;

export const useArticles = (filters: { category?: string; company?: string; q?: string }) => {
  const { company, category, q } = filters;
  const queryKey = useMemo<[string, string]>(
    () => ['articles', JSON.stringify({ company, category, q })],
    [company, category, q]
  );
  return useInfiniteQuery<PageData, Error, InfiniteData<PageData>, [string, string], number>({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let q = supabase
        .from('ai_company_news')
        .select('id, company, published_at, url, title, summary, source_type, content')
        .order('published_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filters.category && filters.category !== 'All')
        q = q.eq('source_type', filters.category);
      if (filters.company && filters.company !== 'All')
        q = q.eq('company', filters.company);
      if (filters.q && filters.q.trim() !== '') {
        const pattern = `%${filters.q.trim()}%`;
        // Search in title or summary (case-insensitive)
        q = q.or(`title.ilike.${pattern},summary.ilike.${pattern}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      const articles = Array.isArray(data) ? data : [];
      const next = articles.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined;
      return { data: articles as Article[], next } satisfies PageData;
    },
    getNextPageParam: (last) => {
      return last.next;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1
  });
};
