import React from 'react';
import { companies } from '../lib/companyCatalog.js';

interface CompanySelectProps {
  activeCompany: string;
  onCompanyChange: (company: string) => void;
}

export default function CompanySelect({ activeCompany, onCompanyChange }: CompanySelectProps) {
  return (
    <div className="relative w-full">
      <div className="mx-auto max-w-7xl border border-white/20 bg-bg-1">
        <div
          className="hide-scrollbar mx-auto flex w-full max-w-full snap-x snap-mandatory gap-px overflow-x-auto bg-white/15"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)'
          }}
        >
          {companies.map((company, index) => {
            const isActive = activeCompany === company.name;
            return (
              <button
                type="button"
                key={company.name}
                className={`
                group relative flex h-[84px] w-[96px] shrink-0 snap-center flex-col items-center justify-center bg-bg-0 p-2 transition-all duration-300 sm:w-[120px]
                ${isActive
                    ? 'bg-brand text-white'
                    : 'text-text-2 hover:bg-white/10 hover:text-white'
                  }
              `}
                aria-pressed={isActive}
                aria-label={company.name}
                title={company.name}
                onClick={() => onCompanyChange && onCompanyChange(company.name)}
              >
                <div className={`
                relative mb-2 flex h-8 w-8 items-center justify-center border border-white/20 bg-white transition-transform duration-300
                ${isActive ? 'scale-105' : 'group-hover:scale-105'}
              `}>
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={`${company.name} provider mark`}
                      className="h-6 w-6 object-contain grayscale contrast-125"
                      loading={index < 3 ? "eager" : "lazy"}
                      width="24"
                      height="24"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    </svg>
                  )}
                </div>

                <span className={`
                micro-label max-w-full truncate transition-colors duration-300
                ${isActive ? 'text-white' : 'text-text-2'}
              `}>
                  {company.name}
                </span>

                {isActive && (
                  <span className="absolute bottom-0 left-0 h-1 w-full bg-white" aria-hidden="true"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
