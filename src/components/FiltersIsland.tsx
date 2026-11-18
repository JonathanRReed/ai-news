import React, { useEffect, useState } from "react";
import CompanySelect from "./CompanySelect.js";
import { TOPICS } from "../lib/articleTags.js";
import type { ArticleFilters } from "../hooks/fetchArticlesPage.js";
import type { FeedKind, FeedView } from "./ArticlesIslandWrapper.js";
import { MAX_SEARCH_QUERY_LENGTH, normalizeSearchInput } from "../lib/intelligenceClient.js";

interface FiltersIslandProps {
  filters: ArticleFilters;
  setFilters: React.Dispatch<React.SetStateAction<ArticleFilters>>;
  density: "comfortable" | "compact";
  setDensity: React.Dispatch<React.SetStateAction<"comfortable" | "compact">>;
  view: FeedView;
  setView: React.Dispatch<React.SetStateAction<FeedView>>;
  kind: FeedKind;
  setKind: React.Dispatch<React.SetStateAction<FeedKind>>;
  savedCount: number;
}

const VIEWS: { value: FeedView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "saved", label: "Saved" },
];

const KINDS: { value: FeedKind; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "news", label: "News" },
  { value: "releases", label: "Software releases" },
];

const DENSITIES: { value: "comfortable" | "compact"; label: string }[] = [
  { value: "comfortable", label: "Previews" },
  { value: "compact", label: "Headlines" },
];

function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="feed-segment" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="focus-industrial"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function FiltersIsland({ filters, setFilters, density, setDensity, view, setView, kind, setKind, savedCount }: FiltersIslandProps) {
  const activeTopics = filters.topics ?? [];
  // Search, publishers, read state and record type stay in view. Topics, and on small
  // screens the record type and density too, sit behind one control that reports its count.
  const [moreOpen, setMoreOpen] = useState(false);
  const hasActiveTopics = activeTopics.length > 0;
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // A pressed topic (from a shared link, say) must never be hidden behind a closed control.
    if (hasActiveTopics) setMoreOpen(true);
  }, [hasActiveTopics]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTopic = (key: string) =>
    setFilters((f) => {
      const current = f.topics ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return { ...f, topics: next };
    });

  const views = VIEWS.map((v) => (
    v.value === "saved" && savedCount > 0 ? { ...v, label: `Saved ${savedCount}` } : v
  ));

  return (
    <div className="feed-toolbar">
      <div className="group relative flex min-h-[52px] items-center">
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
          placeholder="Search every tracked source"
          className="focus-industrial h-full min-h-[52px] w-full border-none bg-transparent py-3 pl-12 pr-12 text-base text-white placeholder:text-text-2"
          value={filters.q || ""}
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          onChange={(e) => setFilters((f) => ({ ...f, q: normalizeSearchInput(e.target.value) }))}
          aria-label="Search articles"
        />
        {filters.q ? (
          <button
            className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center text-text-2 transition-colors hover:text-white focus-industrial"
            onClick={() => setFilters((f) => ({ ...f, q: "" }))}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-4 hidden border border-white/20 px-1.5 py-0.5 font-mono text-xs text-text-2 md:block" aria-hidden="true">/</kbd>
        )}
      </div>

      <div className="border-t border-white/[0.12]">
        <CompanySelect
          activeCompany={filters.company ?? "All"}
          onCompanyChange={(company) => setFilters((f) => ({ ...f, company }))}
        />
      </div>

      <div className="feed-toolbar-row">
        <Segment label="Filter by read state" options={views} value={view} onChange={setView} />
        <div className="max-md:hidden">
          <Segment label="Filter by record type" options={KINDS} value={kind} onChange={setKind} />
        </div>
        {/* .feed-chip is unlayered CSS and would beat a responsive utility, so wrappers carry them. */}
        <div className="ml-auto flex items-center gap-3">
          <div className="max-md:hidden">
            <Segment label="Row density" options={DENSITIES} value={density} onChange={setDensity} />
          </div>
          <button
            type="button"
            className="feed-chip focus-industrial gap-2"
            aria-expanded={moreOpen}
            aria-controls="feed-more-filters"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="md:hidden">Filters</span>
            <span className="max-md:hidden">Topics</span>
            {activeTopics.length + (kind !== "all" ? 1 : 0) > 0 && (
              <span className="font-mono tabular-nums text-brand-hover">
                <span className="md:hidden">{activeTopics.length + (kind !== "all" ? 1 : 0)}</span>
                <span className="max-md:hidden">{activeTopics.length || ""}</span>
              </span>
            )}
            <svg className={moreOpen ? "h-3 w-3 rotate-180" : "h-3 w-3"} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
              <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
            </svg>
          </button>
        </div>
      </div>

      <div id="feed-more-filters" hidden={!moreOpen}>
        <div className="md:hidden">
          <div className="feed-toolbar-row">
            <Segment label="Filter by record type" options={KINDS} value={kind} onChange={setKind} />
            <Segment label="Row density" options={DENSITIES} value={density} onChange={setDensity} />
          </div>
        </div>
        <div className="feed-toolbar-row" role="group" aria-label="Filter by topic">
          {TOPICS.map((topic) => (
            <button
              key={topic.key}
              type="button"
              aria-pressed={activeTopics.includes(topic.key)}
              onClick={() => toggleTopic(topic.key)}
              className="feed-chip focus-industrial"
            >
              {topic.label}
            </button>
          ))}
          {activeTopics.length > 0 && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, topics: [] }))}
              className="min-h-[var(--control-h)] px-1 text-xs font-medium text-text-2 underline decoration-brand decoration-2 underline-offset-4 hover:text-white focus-industrial md:min-h-9"
            >
              Clear topics
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
