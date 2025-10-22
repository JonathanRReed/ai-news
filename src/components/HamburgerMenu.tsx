import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  const handleNav = (href: string) => {
    window.location.href = href;
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open navigation menu"
        className="relative z-50 group focus:outline-none font-nebula"
      >
        <span
          className="flex items-center justify-center w-12 h-12 rounded-full border backdrop-blur-md transition-all duration-300 group-hover:border-white/25 group-active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
            boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px) saturate(1.3) brightness(1.05)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="8" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="13" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="18" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
          </svg>
          <span className="absolute inset-0 rounded-full pointer-events-none border border-brand/20 group-hover:border-brand/90 transition-all duration-500" />
        </span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen bg-bg-0/90 backdrop-blur-md">
          <div className="glassmorphic-modal relative flex flex-col items-center px-8 py-12 min-w-[80vw] max-w-xs sm:max-w-md shadow-2xl z-[10001]">
            <button
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 hover:border-white/25 active:scale-95 focus:outline-none font-nebula z-[10002]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px) saturate(1.3) brightness(1.05)',
              }}
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-1">
                <line x1="6" y1="6" x2="16" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 group-hover:stroke-brand" />
                <line x1="16" y1="6" x2="6" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 group-hover:stroke-brand" />
              </svg>
              <span className="absolute inset-0 rounded-full pointer-events-none border border-brand/20 hover:border-brand/90 transition-all duration-500" />
            </button>
            <nav className="flex flex-1 flex-col items-center justify-center gap-8 w-full px-2 py-8 z-10">
              <a
                href="/"
                className="menu-gradient-link text-2xl md:text-3xl py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/60 w-full text-center transition-all"
                onClick={e => { e.preventDefault(); handleNav('/'); }}
              >
                Home
              </a>
              <a
                href="/about"
                className="menu-gradient-link text-2xl md:text-3xl py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/60 w-full text-center transition-all"
                onClick={e => { e.preventDefault(); handleNav('/about'); }}
              >
                About
              </a>
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
