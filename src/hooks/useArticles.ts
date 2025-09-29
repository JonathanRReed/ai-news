import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { fetchArticlesPage, PAGE_SIZE } from './fetchArticlesPage.js';
import type { PageData } from '../types/article.js';

export { PAGE_SIZE };

export const useArticles = (filters: { category?: string; company?: string; q?: string }) => {
  const { company, category, q } = filters;
  const queryKey = useMemo<[string, string]>(
    () => ['articles', JSON.stringify({ company, category, q })],
    [company, category, q]
  );
  return useInfiniteQuery<PageData, Error, InfiniteData<PageData>, [string, string], number>({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) => fetchArticlesPage(filters, pageParam),
    getNextPageParam: (last) => last.next,
  });
};
