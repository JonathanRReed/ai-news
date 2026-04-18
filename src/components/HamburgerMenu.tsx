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
        className="group relative z-50 font-mono focus-industrial"
      >
        <span
          className="flex h-12 w-12 items-center justify-center border border-white/25 bg-white/5 transition-all duration-300 group-hover:border-brand group-hover:bg-brand group-active:scale-95"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="8" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="13" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="18" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
          </svg>
          <span className="pointer-events-none absolute inset-0 border border-brand/20 transition-all duration-500 group-hover:border-white/70" />
        </span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-bg-0/95 px-4 backdrop-blur-sm">
          <div className="relative z-[10001] flex min-w-[80vw] max-w-sm flex-col items-center border border-white/25 bg-bg-1 px-8 py-12 shadow-2xl sm:max-w-md">
            <button
              className="focus-industrial absolute right-4 top-4 z-[10002] flex h-11 w-11 items-center justify-center border border-white/25 bg-white/5 transition-all duration-300 hover:border-brand hover:bg-brand active:scale-95"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              }}
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-1">
                <line x1="6" y1="6" x2="16" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 group-hover:stroke-brand" />
                <line x1="16" y1="6" x2="6" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 group-hover:stroke-brand" />
              </svg>
              <span className="pointer-events-none absolute inset-0 border border-brand/20 transition-all duration-500 hover:border-white/70" />
            </button>
            <nav className="z-10 flex w-full flex-1 flex-col items-stretch justify-center gap-3 px-2 py-8">
              <a
                href="/"
                className="menu-gradient-link w-full border border-white/20 px-6 py-4 text-left text-2xl transition-all focus-industrial md:text-3xl"
                onClick={e => { e.preventDefault(); handleNav('/'); }}
              >
                [ Home ]
              </a>
              <a
                href="/about"
                className="menu-gradient-link w-full border border-white/20 px-6 py-4 text-left text-2xl transition-all focus-industrial md:text-3xl"
                onClick={e => { e.preventDefault(); handleNav('/about'); }}
              >
                [ About ]
              </a>
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
