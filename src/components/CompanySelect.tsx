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
    <div className="glassmorphic-company-card px-4 py-5 mb-4 flex justify-center items-center">
      <div className="flex gap-1.5 sm:gap-3 md:gap-5 overflow-x-auto pb-4 pt-2 px-3 hide-scrollbar min-w-0 flex-nowrap selector-container">
        {companies.map((company, idx) => (
          <button
            type="button"
            key={company.name}
            className={`flex flex-col items-center px-2 sm:px-1 py-2 rounded-xl transition-all border focus:outline-none 
              min-w-[72px] min-h-[72px]
              md:min-w-[70px] md:min-h-[70px]
              flex-shrink-0
              backdrop-blur-sm
              ${idx === 0 ? 'ml-3' : ''}
              ${activeCompany === company.name
                ? 'border-brand/25 bg-brand/8 shadow-[0_4px_16px_0_rgba(156,207,216,0.12)] scale-[1.02]'
                : 'border-white/6 bg-white/5 hover:border-white/15 hover:bg-white/8'}`}
            aria-pressed={activeCompany === company.name}
            aria-label={company.name}
            onClick={() => onCompanyChange && onCompanyChange(company.name)}
            tabIndex={0}
          >
            {company.logo ? (
              <span className={`w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full mb-1 ${
                activeCompany === company.name 
                  ? 'bg-brand/15 ring-1 ring-brand/40' 
                  : 'bg-white/10 ring-1 ring-white/20'
              }`}>
                <img src={company.logo} alt={company.name + ' logo'} className="w-8 h-8 md:w-8 md:h-8 sm:w-7 sm:h-7 rounded-full" loading="lazy" />
              </span>
            ) : company.name === 'All' ? (
              <span className={`w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full mb-1 ${
                activeCompany === company.name 
                  ? 'bg-brand/15 ring-1 ring-brand/40' 
                  : 'bg-white/10 ring-1 ring-white/20'
              }`}>
                <img src="/logos/Globe Icon.svg" alt="All providers globe icon" className="w-8 h-8 md:w-8 md:h-8 sm:w-7 sm:h-7 rounded-full" loading="lazy" />
              </span>
            ) : (
              <span className={`w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full mb-1 ${
                activeCompany === company.name 
                  ? 'bg-brand/15 ring-1 ring-brand/40' 
                  : 'bg-white/10 ring-1 ring-white/20'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" className="md:w-8 md:h-8 text-brand" fill="none" viewBox="0 0 24 24">
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
