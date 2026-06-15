import React, { useState, useMemo, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { ArticlesProvider } from "../hooks/useArticlesContext.js";
import { PAGE_SIZE } from "../hooks/useArticles.js";
import ArticleListIsland from "./ArticleListIsland.js";
import FiltersIsland from "./FiltersIsland.js";
import { useReadState } from "../hooks/useReadState.js";
import type { ArticleFilters } from "../hooks/fetchArticlesPage.js";
import type { Article, PageData } from "../types/article.js";

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

export type FeedView = "all" | "unread" | "saved";

function urlFilters(): ArticleFilters | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const company = params.get("company");
  const topic = params.get("topic");
  const q = params.get("q");
  if (!company && !topic && !q) return null;
  return {
    company: company || "All",
    topics: (topic || "").split(",").map((s) => s.trim()).filter(Boolean),
    q: q || "",
  };
}

export default function ArticlesIslandWrapper({ initialArticles = [], now = 0 }: { initialArticles?: Article[]; now?: number }) {
  // Start from defaults so the server render and the first client render match (no
  // hydration mismatch); URL filters and saved density are applied after mount.
  const [filters, setFilters] = useState<ArticleFilters>({ company: "All", topics: [], q: "" });
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [view, setView] = useState<FeedView>("all");
  const readState = useReadState();
  const firstWrite = useRef(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const fromUrl = urlFilters();
    if (fromUrl) setFilters(fromUrl);
    const savedDensity = window.localStorage.getItem("ai-news-density");
    if (savedDensity === "compact" || savedDensity === "comfortable") setDensity(savedDensity);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("ai-news-density", density);
  }, [density]);

  // Keep the URL in sync so any filtered view is shareable (skip the first run so we
  // don't clobber inbound URL params before they're applied).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (filters.company && filters.company !== "All") params.set("company", filters.company);
    if (filters.topics && filters.topics.length) params.set("topic", filters.topics.join(","));
    if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [filters]);

  const { company, topics, q } = filters;
  const stableFilters = useMemo<ArticleFilters>(() => ({ company, topics, q }), [company, topics, q]);
  const isDefault = company === "All" && !(topics && topics.length) && !(q && q.trim());

  const initialData: InfiniteData<PageData> | undefined =
    isDefault && initialArticles.length
      ? { pages: [{ data: initialArticles, next: initialArticles.length >= PAGE_SIZE ? PAGE_SIZE : undefined }], pageParams: [0] }
      : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <ArticlesProvider filters={stableFilters} initialData={initialData}>
        <div className="mb-8 flex flex-col gap-4">
          <FiltersIsland
            filters={filters}
            setFilters={setFilters}
            density={density}
            setDensity={setDensity}
            view={view}
            setView={setView}
            savedCount={readState.saved.size}
          />
        </div>
        <ArticleListIsland density={density} view={view} readState={readState} now={now} />
      </ArticlesProvider>
    </QueryClientProvider>
  );
}
