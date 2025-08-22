import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { useArticles, PAGE_SIZE } from "./useArticles.js";
import type { PageData } from "../types/article.js";

type Filters = { category?: string; company?: string; q?: string };

export type ArticlesContextValue = (
  UseInfiniteQueryResult<InfiniteData<PageData>, Error> & {
    filters: Filters;
    PAGE_SIZE: number;
  }
);

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ filters, children }: { filters: Filters; children: ReactNode }) {
  const query = useArticles(filters);
  return (
    <ArticlesContext.Provider value={{ ...query, filters, PAGE_SIZE }}>
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticlesContext(): ArticlesContextValue {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error("useArticlesContext must be used within an ArticlesProvider");
  return ctx;
}
