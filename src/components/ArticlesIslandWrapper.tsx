import React, { useState, useMemo, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArticlesProvider } from "../hooks/useArticlesContext.js";
import ArticleListIsland from "./ArticleListIsland.js";
import FiltersIsland from "./FiltersIsland.js";
import { fetchArticlesPage } from "../hooks/fetchArticlesPage.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function ArticlesIslandWrapper() {
  type Filters = { company: string; category: string; q?: string };
  const [filters, setFilters] = useState<Filters>({ company: "All", category: "All", q: "" });
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Load saved density preference
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('ai-news-density') : null;
    if (saved === 'compact' || saved === 'comfortable') setDensity(saved);
  }, []);

  // Persist density preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ai-news-density', density);
    }
  }, [density]);

  const { company, category, q } = filters;
  const stableFilters = useMemo(() => ({ company, category, q }), [company, category, q]);

  const handlePrefetch = useCallback(async (next: Partial<Filters>) => {
    const merged = { ...stableFilters, ...next };
    const key: [string, string] = ['articles', JSON.stringify(merged)];
    await queryClient.prefetchInfiniteQuery({
      queryKey: key,
      initialPageParam: 0,
      queryFn: ({ pageParam = 0 }) => fetchArticlesPage(merged, pageParam),
      getNextPageParam: (lastPage: Awaited<ReturnType<typeof fetchArticlesPage>>) => lastPage.next,
    });
  }, [stableFilters]);

  // Removed global refresh callback per request
  return (
    <QueryClientProvider client={queryClient}>
      <ArticlesProvider filters={stableFilters}>
        <div className="flex flex-col gap-3 mb-4">
          <FiltersIsland
            filters={filters}
            setFilters={setFilters}
            onPrefetch={handlePrefetch}
            density={density}
            setDensity={setDensity}
          />
        </div>
        <ArticleListIsland density={density} />
      </ArticlesProvider>
    </QueryClientProvider>
  );
}
// No badge rendering logic here, but included for completeness if future badge logic is added.
