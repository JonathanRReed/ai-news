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
    <div className="w-full">
      <CompanySelect
        activeCompany={filters.company}
        onCompanyChange={company => setFilters(f => ({ ...f, company }))}
      />
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="relative w-full sm:max-w-sm">
          <input
            type="search"
            inputMode="search"
            placeholder="Search titles or summary…"
            className="w-full rounded-full bg-white/10 border border-white/15 text-white placeholder-white/50 px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/60"
            value={filters.q || ""}
            onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
            aria-label="Search articles"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          {filters.q ? (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xs"
              onClick={() => setFilters(f => ({ ...f, q: "" }))}
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto ml-0 sm:ml-2">
          <span className="text-[11px] md:text-sm text-white/60">Density</span>
          <div className="inline-flex rounded-full border border-white/15 overflow-hidden">
            <button
              className={`px-2 md:px-3 py-1 text-xs md:text-sm ${density === 'comfortable' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'}`}
              onClick={() => setDensity && setDensity('comfortable')}
              aria-pressed={density === 'comfortable'}
            >Comfortable</button>
            <button
              className={`px-2 md:px-3 py-1 text-xs md:text-sm ${density === 'compact' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'}`}
              onClick={() => setDensity && setDensity('compact')}
              aria-pressed={density === 'compact'}
            >Compact</button>
          </div>
        </div>
      </div>
    </div>
  );
}
