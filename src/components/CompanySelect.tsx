import React from 'react';

interface CompanySelectProps {
  activeCompany: string;
  onCompanyChange: (company: string) => void;
}

const companies = [
  { name: 'All', logo: '/logos/Globe Icon.svg' },
  { name: 'Meta AI', logo: '/logos/Meta_logo.svg' },
  { name: 'OpenAI', logo: '/logos/OpenAI_logo.svg' },
  { name: 'Anthropic', logo: '/logos/Anthropic_logo.svg' },
  { name: 'Google DeepMind', logo: '/logos/DeepMind_logo.svg' },
  { name: 'Mistral AI', logo: '/logos/Mistral_logo.svg' },
  { name: 'Hugging Face', logo: '/logos/Hugging_Face_logo.svg' },
  { name: 'xAI', logo: '/logos/Xai_logo.svg' }
];

export default function CompanySelect({ activeCompany, onCompanyChange }: CompanySelectProps) {
  return (
    <div className="w-full mb-8 relative px-4">
      <div className="max-w-7xl mx-auto rounded-[2rem] border border-white/10 bg-white/5 p-1.5 shadow-2xl backdrop-blur-sm">
        <div
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 pt-2 px-2 hide-scrollbar snap-x snap-mandatory mx-auto max-w-full w-full"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)'
          }}
        >
          {companies.map((company) => {
            const isActive = activeCompany === company.name;
            return (
              <button
                type="button"
                key={company.name}
                className={`
                group relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300
                w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] snap-center shrink-0
                ${isActive
                    ? 'bg-white/10 shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] ring-1 ring-white/20'
                    : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }
              `}
                aria-pressed={isActive}
                aria-label={company.name}
                onClick={() => onCompanyChange && onCompanyChange(company.name)}
              >
                <div className={`
                relative mb-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform duration-300
                ${isActive ? 'scale-110' : 'group-hover:scale-105'}
              `}>
                  {company.logo ? (
                    <img src={company.logo} alt="" className="w-full h-full object-contain drop-shadow-sm" loading="lazy" />
                  ) : company.name === 'All' ? (
                    <img src="/logos/Globe Icon.svg" alt="" className="w-full h-full object-contain drop-shadow-sm" loading="lazy" />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    </svg>
                  )}
                </div>

                <span className={`
                text-[10px] sm:text-[11px] font-medium tracking-wide transition-colors duration-300 truncate max-w-full
                ${isActive ? 'text-white' : 'text-white/70'}
              `}>
                  {company.name}
                </span>

                {/* Active Indicator Glow */}
                {isActive && (
                  <div className="absolute inset-x-0 -bottom-2 h-8 bg-brand/20 blur-xl rounded-full z-[-1] opacity-60"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
