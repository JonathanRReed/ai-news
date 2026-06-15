import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { fetchArticlesPage, PAGE_SIZE } from './fetchArticlesPage.js';
import type { ArticleFilters } from './fetchArticlesPage.js';
import type { PageData } from '../types/article.js';

export { PAGE_SIZE };

export const useArticles = (filters: ArticleFilters, initialData?: InfiniteData<PageData>) => {
  const { company, topics, q } = filters;
  const queryKey = useMemo<[string, string]>(
    () => ['articles', JSON.stringify({ company, topics, q })],
    [company, topics, q]
  );
  return useInfiniteQuery<PageData, Error, InfiniteData<PageData>, [string, string], number>({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => fetchArticlesPage(filters, pageParam),
    getNextPageParam: (last) => last.next,
    maxPages: 10, // Limit to 200 articles (10 pages × 20) to prevent memory bloat
    initialData,
    // Treat seeded data as stale so the client refetches in the background to merge
    // live Supabase rows and full content over the SSR-seeded first page.
    initialDataUpdatedAt: initialData ? 0 : undefined,
  });
};
