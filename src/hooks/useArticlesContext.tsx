import { createContext, useContext, ReactNode } from "react";
import { useArticles, PAGE_SIZE } from "./useArticles.js";

const ArticlesContext = createContext<any>(null);

export function ArticlesProvider({ filters, children }: { filters: { category?: string; company?: string }, children: ReactNode }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    ...rest
  } = useArticles(filters);

  return (
    <ArticlesContext.Provider value={{
      data,
      fetchNextPage,
      hasNextPage,
      isFetching,
      PAGE_SIZE,
      ...rest
    }}>
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticlesContext() {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error("useArticlesContext must be used within an ArticlesProvider");
  return ctx;
}
