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
    <div className="w-full flex flex-col items-center gap-4">
      {/* Company Selector - visually refined in next step */}
      <CompanySelect
        activeCompany={filters.company}
        onCompanyChange={company => setFilters(f => ({ ...f, company }))}
      />

      {/* Command Stick: Search & Density */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 w-full max-w-2xl mx-auto transition-all hover:bg-white/8 hover:border-white/15">

        {/* Search Input Group */}
        <div className="relative flex-1 w-full sm:w-auto group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-brand transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="search"
            inputMode="search"
            placeholder="Search AI News..."
            className="w-full pl-11 pr-10 py-3 bg-transparent text-sm text-white placeholder-white/40 border-none focus:ring-0 focus:outline-none rounded-2xl hover:bg-white/5 transition-colors"
            value={filters.q || ""}
            onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
            aria-label="Search articles"
          />
          {filters.q && (
            <button
              className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white transition-colors p-1"
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

        {/* Divider (Desktop) */}
        <div className="hidden sm:block w-px h-8 bg-white/10 mx-1"></div>

        {/* Density Toggle Group */}
        <div className="flex bg-black/30 rounded-2xl p-1 gap-1 w-full sm:w-auto shrink-0">
          <button
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-xl transition-all duration-200 ${density === 'comfortable' ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            onClick={() => setDensity && setDensity('comfortable')}
          >
            Comfortable
          </button>
          <button
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-xl transition-all duration-200 ${density === 'compact' ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            onClick={() => setDensity && setDensity('compact')}
          >
            Compact
          </button>
        </div>
      </div>
    </div>
  );
}
