import React from "react";
import CompanySelect from "./CompanySelect.js";
import { TOPICS } from "../lib/articleTags.js";
import type { ArticleFilters } from "../hooks/fetchArticlesPage.js";
import type { FeedView } from "./ArticlesIslandWrapper.js";

interface FiltersIslandProps {
  filters: ArticleFilters;
  setFilters: React.Dispatch<React.SetStateAction<ArticleFilters>>;
  density?: "comfortable" | "compact";
  setDensity?: React.Dispatch<React.SetStateAction<"comfortable" | "compact">>;
  view: FeedView;
  setView: React.Dispatch<React.SetStateAction<FeedView>>;
  savedCount: number;
}

const VIEWS: { value: FeedView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "saved", label: "Saved" },
];

export default function FiltersIsland({ filters, setFilters, density, setDensity, view, setView, savedCount }: FiltersIslandProps) {
  const activeTopics = filters.topics ?? [];

  const toggleTopic = (key: string) =>
    setFilters((f) => {
      const current = f.topics ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return { ...f, topics: next };
    });

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CompanySelect
        activeCompany={filters.company ?? "All"}
        onCompanyChange={(company) => setFilters((f) => ({ ...f, company }))}
      />

      <div className="w-full max-w-7xl border border-white/20 bg-bg-1">
        {/* Search */}
        <div className="group relative flex min-h-[60px] items-center border-b border-white/15">
          <label htmlFor="article-search" className="sr-only">Search articles</label>
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-2 transition-colors group-focus-within:text-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            id="article-search"
            type="search"
            inputMode="search"
            placeholder="Search across every tracked source"
            className="h-full min-h-[60px] w-full border-none bg-transparent py-4 pl-12 pr-12 text-base text-white placeholder:text-text-2 focus:outline-none focus:ring-0"
            value={filters.q || ""}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            aria-label="Search articles"
          />
          {filters.q && (
            <button
              className="absolute inset-y-0 right-3 flex min-h-11 min-w-11 items-center justify-center text-text-2 transition-colors hover:text-white focus-industrial"
              onClick={() => setFilters((f) => ({ ...f, q: "" }))}
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Topics + views + density */}
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by topic">
            <span className="micro-label mr-1 text-text-2">Topics</span>
            {TOPICS.map((topic) => {
              const active = activeTopics.includes(topic.key);
              return (
                <button
                  key={topic.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTopic(topic.key)}
                  className={`min-h-9 border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] transition-colors focus-industrial ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-white/20 text-text-2 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
            {activeTopics.length > 0 && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, topics: [] }))}
                className="min-h-9 px-2 font-mono text-xs uppercase tracking-[0.06em] text-text-2 underline decoration-brand decoration-2 underline-offset-4 hover:text-white focus-industrial"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex border border-white/20" role="group" aria-label="Filter by read state">
              {VIEWS.map((v, i) => (
                <button
                  key={v.value}
                  type="button"
                  aria-pressed={view === v.value}
                  onClick={() => setView(v.value)}
                  className={`min-h-9 px-3 font-mono text-xs uppercase tracking-[0.06em] transition-colors focus-industrial ${
                    i === VIEWS.length - 1 ? "" : "border-r border-white/20"
                  } ${view === v.value ? "bg-white text-bg-0" : "text-text-2 hover:bg-white/10 hover:text-white"}`}
                >
                  {v.label}
                  {v.value === "saved" && savedCount > 0 ? ` ${savedCount}` : ""}
                </button>
              ))}
            </div>

            <div className="flex border border-white/20" role="group" aria-label="Card density">
              <button
                type="button"
                aria-pressed={density === "comfortable"}
                className={`min-h-9 border-r border-white/20 px-3 font-mono text-xs uppercase tracking-[0.06em] transition-colors focus-industrial ${density === "comfortable" ? "bg-white text-bg-0" : "text-text-2 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setDensity && setDensity("comfortable")}
              >
                Comfortable
              </button>
              <button
                type="button"
                aria-pressed={density === "compact"}
                className={`min-h-9 px-3 font-mono text-xs uppercase tracking-[0.06em] transition-colors focus-industrial ${density === "compact" ? "bg-white text-bg-0" : "text-text-2 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setDensity && setDensity("compact")}
              >
                Compact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
