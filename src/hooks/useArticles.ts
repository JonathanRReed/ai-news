import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';

export const PAGE_SIZE = 20;

interface Article {
  id: string;
  company: string;
  title: string;
  url: string;
}

export const useArticles = (filters: { category?: string; company?: string; q?: string }) => {
  const queryKey = useMemo<[string, string]>(
    () => ['articles', JSON.stringify(filters)],
    [filters.company, filters.category, filters.q]
  );
  return useInfiniteQuery<{ data: Article[]; next?: number }, Error, InfiniteData<{ data: Article[]; next?: number }>, [string, string], number>({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
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
        // Search in title or summary (case-insensitive)
        q = q.or(`title.ilike.${pattern},summary.ilike.${pattern}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      const articles = Array.isArray(data) ? data : [];
      console.log('[useArticles.queryFn] returned articles:', articles);
      const next = articles.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined;
      console.log('[useArticles.queryFn]', { pageParam, returned: articles.length, next });
      return { data: articles as Article[], next };
    },
    getNextPageParam: (last) => {
      console.log('[useArticles.getNextPageParam]', { last });
      return last.next;
    },
    staleTime: 60_000
  });
};
