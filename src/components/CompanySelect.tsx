import React, { useEffect, useRef } from 'react';
import { companies } from '../lib/companyCatalog.js';

interface CompanySelectProps {
  activeCompany: string;
  onCompanyChange: (company: string) => void;
}

export default function CompanySelect({ activeCompany, onCompanyChange }: CompanySelectProps) {
  const strip = useRef<HTMLDivElement>(null);

  // A publisher chosen from a shared link can sit far off to the right. Bring the pressed chip
  // into the strip by scrolling the strip only, never the page.
  useEffect(() => {
    const container = strip.current;
    const pressed = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !pressed) return;
    const left = pressed.offsetLeft;
    const right = left + pressed.offsetWidth;
    if (left < container.scrollLeft || right > container.scrollLeft + container.clientWidth - 40) {
      container.scrollLeft = Math.max(0, left - 16);
    }
  }, [activeCompany]);

  return (
    <div ref={strip} role="group" aria-label="Filter by lab or provider" className="company-strip">
      {companies.map((company, index) => {
        const isAll = company.name === 'All';
        return (
          <button
            type="button"
            key={company.name}
            className="company-chip"
            aria-pressed={activeCompany === company.name}
            onClick={() => onCompanyChange(company.name)}
          >
            {!isAll && company.logo && (
              <span className="company-chip-logo">
                {/* The button text already names the publisher. */}
                <img src={company.logo} alt="" loading={index < 8 ? 'eager' : 'lazy'} width="16" height="16" />
              </span>
            )}
            {isAll ? 'All publishers' : company.name}
          </button>
        );
      })}
    </div>
  );
}
