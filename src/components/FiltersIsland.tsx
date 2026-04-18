import React from "react";
import CompanySelect from "./CompanySelect.js";

type Filters = { company: string; category: string; q?: string };

export default function FiltersIsland({ filters, setFilters, onPrefetch: _onPrefetch, density, setDensity }: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onPrefetch?: (next: Partial<Filters>) => Promise<void> | void;
  density?: 'comfortable' | 'compact';
  setDensity?: React.Dispatch<React.SetStateAction<'comfortable' | 'compact'>>;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CompanySelect
        activeCompany={filters.company}
        onCompanyChange={company => setFilters(f => ({ ...f, company }))}
      />

      <div className="industrial-grid relative z-20 w-full max-w-5xl">
        <div className="group relative col-span-12 flex min-h-[64px] items-center bg-bg-0 md:col-span-7">
          <label htmlFor="article-search" className="sr-only">Search articles</label>
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-2 transition-colors group-focus-within:text-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            id="article-search"
            type="search"
            inputMode="search"
            placeholder="Search articles"
            className="h-full min-h-[64px] w-full border-none bg-transparent py-4 pl-12 pr-12 font-mono text-sm uppercase tracking-[0.05em] text-white placeholder:text-text-2 focus:outline-none focus:ring-0"
            value={filters.q || ""}
            onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
            aria-label="Search articles"
          />
          {filters.q && (
            <button
              className="absolute inset-y-0 right-3 flex min-h-11 min-w-11 items-center justify-center text-text-2 transition-colors hover:text-white focus-industrial"
              onClick={() => setFilters(f => ({ ...f, q: "" }))}
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="col-span-12 grid grid-cols-2 bg-bg-0 md:col-span-5">
          <button
            type="button"
            aria-pressed={density === 'comfortable'}
            className={`micro-label min-h-[64px] border-r border-white/20 px-4 transition-all duration-200 focus-industrial ${density === 'comfortable' ? 'bg-white text-bg-0' : 'text-text-2 hover:bg-white/10 hover:text-white'}`}
            onClick={() => setDensity && setDensity('comfortable')}
          >
            Comfortable
          </button>
          <button
            type="button"
            aria-pressed={density === 'compact'}
            className={`micro-label min-h-[64px] px-4 transition-all duration-200 focus-industrial ${density === 'compact' ? 'bg-white text-bg-0' : 'text-text-2 hover:bg-white/10 hover:text-white'}`}
            onClick={() => setDensity && setDensity('compact')}
          >
            Compact
          </button>
        </div>
      </div>
    </div>
  );
}
