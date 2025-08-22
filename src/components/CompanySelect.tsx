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
    <div className="glassmorphic-company-card px-2 py-3 mb-8 flex justify-center items-center">
      <div className="flex gap-1.5 sm:gap-3 md:gap-5 overflow-x-auto pb-2 hide-scrollbar min-w-0 flex-nowrap selector-container">
        {companies.map((company) => (
          <button
            type="button"
            key={company.name}
            className={`flex flex-col items-center px-2 sm:px-1 py-2 rounded-xl transition-all border-2 focus:outline-none 
              min-w-[72px] min-h-[72px]
              md:min-w-[70px] md:min-h-[70px]
              flex-shrink-0
              bg-black/50 backdrop-blur-sm
              ${activeCompany === company.name
                ? 'border-cyan bg-white/10 shadow-[0_0_12px_2px_rgba(77,255,240,0.25)]'
                : 'border-cyan/30 hover:border-magenta/60 hover:bg-magenta/10'}`}
            aria-pressed={activeCompany === company.name}
            aria-label={company.name}
            onClick={() => onCompanyChange && onCompanyChange(company.name)}
            tabIndex={0}
          >
            {company.logo ? (
              <span className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mb-1">
                <img src={company.logo} alt={company.name + ' logo'} className="w-8 h-8 md:w-8 md:h-8 sm:w-7 sm:h-7 rounded-full" loading="lazy" />
              </span>
            ) : company.name === 'All' ? (
              <span className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mb-1">
                <img src="/logos/Globe Icon.svg" alt="All providers globe icon" className="w-8 h-8 md:w-8 md:h-8 sm:w-7 sm:h-7 rounded-full" loading="lazy" />
              </span>
            ) : (
              <span className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" className="md:w-8 md:h-8 text-cyan" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path stroke="currentColor" strokeWidth="2" d="M2 12h20M12 2c2.5 2.5 2.5 17.5 0 20M12 2c-2.5 2.5-2.5 17.5 0 20" />
                </svg>
              </span>
            )}
            <span className="text-xs md:text-sm font-medium text-white truncate max-w-[64px] md:max-w-[64px] sm:max-w-[48px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              {company.name}
            </span>
          </button>
        ))}
      </div>
      <style>{`
        .selector-container {
          transition: max-width 0.3s, padding 0.3s;
          max-width: 100vw;
          padding-left: 0;
          padding-right: 0;
        }
      `}</style>
    </div>
  );
}
