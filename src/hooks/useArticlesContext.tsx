import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { useArticles, PAGE_SIZE } from "./useArticles.js";
import type { ArticleFilters } from "./fetchArticlesPage.js";
import type { PageData } from "../types/article.js";

type Props = { filters: ArticleFilters; initialData?: InfiniteData<PageData, number>; children: ReactNode };

export type ArticlesContextValue = (
  UseInfiniteQueryResult<InfiniteData<PageData>, Error> & {
    filters: ArticleFilters;
    PAGE_SIZE: number;
  }
);

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ filters, initialData, children }: Props) {
  const query = useArticles(filters, initialData);
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
