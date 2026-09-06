import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { fetchArticlesPage, PAGE_SIZE } from './fetchArticlesPage.js';
import type { ArticleFilters } from './fetchArticlesPage.js';
import type { PageData } from '../types/article.js';
import type { FeedCursor } from '../types/intelligence.js';

export { PAGE_SIZE };

export const useArticles = (filters: ArticleFilters, initialData?: InfiniteData<PageData, FeedCursor | null>) => {
  const { company, topics, q } = filters;
  const queryKey = useMemo<[string, string]>(
    () => ['articles', JSON.stringify({ company, topics, q })],
    [company, topics, q]
  );
  return useInfiniteQuery<PageData, Error, InfiniteData<PageData>, [string, string], FeedCursor | null>({
    queryKey,
    initialPageParam: null,
    queryFn: ({ pageParam = null }) => fetchArticlesPage(
      filters,
      pageParam,
      pageParam === null ? (initialData?.pages[0]?.data ?? []) : [],
    ),
    getNextPageParam: (last) => last.next,
    maxPages: 10,
    // The search term is debounced upstream; keeping the previous results on screen
    // stops the list collapsing to skeletons between one query key and the next.
    placeholderData: keepPreviousData,
    initialData,
    // Treat seeded data as stale so the client refetches in the background to merge
    // live Supabase rows over the SSR-seeded first page.
    initialDataUpdatedAt: initialData ? 0 : undefined,
  });
};
