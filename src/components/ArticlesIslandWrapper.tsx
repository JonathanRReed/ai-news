import React, { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArticlesProvider } from "../hooks/useArticlesContext.js";
import ArticleListIsland from "./ArticleListIsland.js";
import FiltersIsland from "./FiltersIsland.js";

const queryClient = new QueryClient();

export default function ArticlesIslandWrapper() {
  const [filters, setFilters] = useState({ company: "All", category: "All" });
  const stableFilters = useMemo(() => filters, [filters.company, filters.category]);
  return (
    <QueryClientProvider client={queryClient}>
      <ArticlesProvider filters={stableFilters}>
        <FiltersIsland filters={filters} setFilters={setFilters} />
        <ArticleListIsland />
      </ArticlesProvider>
    </QueryClientProvider>
  );
}
// No badge rendering logic here, but included for completeness if future badge logic is added.
