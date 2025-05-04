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
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black/40 border border-white/20 shadow-[0_0_8px_2px_rgba(77,255,240,0.07),0_0_16px_2px_rgba(255,0,200,0.05)] backdrop-blur-md transition-all duration-500 group-hover:shadow-[0_0_32px_8px_rgba(77,255,240,0.45),0_0_48px_16px_rgba(255,0,200,0.22)] group-hover:border-cyan/70 group-active:scale-95"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="8" width="18" height="2.5" rx="1.25" fill="#fff" className="transition-all duration-500 group-hover:fill-cyan" />
            <rect x="5" y="13" width="18" height="2.5" rx="1.25" fill="#fff" className="transition-all duration-500 group-hover:fill-cyan" />
            <rect x="5" y="18" width="18" height="2.5" rx="1.25" fill="#fff" className="transition-all duration-500 group-hover:fill-cyan" />
          </svg>
          <span className="absolute inset-0 rounded-full pointer-events-none border border-cyan/20 group-hover:border-cyan/90 transition-all duration-500" />
        </span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen bg-black/60 backdrop-blur-md">
          <div className="glassmorphic-modal relative flex flex-col items-center px-8 py-12 min-w-[80vw] max-w-xs sm:max-w-md shadow-2xl z-[10001]">
            <button
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 border border-white/20 shadow-[0_0_8px_2px_rgba(77,255,240,0.07),0_0_16px_2px_rgba(255,0,200,0.05)] backdrop-blur-md transition-all duration-500 hover:shadow-[0_0_32px_8px_rgba(77,255,240,0.45),0_0_48px_16px_rgba(255,0,200,0.22)] hover:border-cyan/70 active:scale-95 focus:outline-none font-nebula z-[10002]"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="6" y1="6" x2="16" y2="16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 hover:stroke-cyan" />
                <line x1="16" y1="6" x2="6" y2="16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" className="transition-all duration-500 hover:stroke-cyan" />
              </svg>
              <span className="absolute inset-0 rounded-full pointer-events-none border border-cyan/20 hover:border-cyan/90 transition-all duration-500" />
            </button>
            <nav className="flex flex-1 flex-col items-center justify-center gap-8 w-full px-2 py-8 z-10">
              <a
                href="/"
                className="menu-gradient-link text-2xl md:text-3xl py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan/60 w-full text-center transition-all"
                onClick={e => { e.preventDefault(); handleNav('/'); }}
              >
                Home
              </a>
              <a
                href="/about"
                className="menu-gradient-link text-2xl md:text-3xl py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan/60 w-full text-center transition-all"
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
