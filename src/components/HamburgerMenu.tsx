import React, { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Latest" },
  { href: "/major-updates/", label: "Major updates" },
  { href: "/labs/", label: "Labs and providers" },
  { href: "/harnesses/", label: "Harnesses" },
  { href: "/digest/daily/", label: "Daily digests" },
  { href: "/watchlist/", label: "My watchlist" },
  { href: "/feeds/", label: "Feeds" },
  { href: "/about/", label: "About" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-testid="mobile-menu-button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="group relative z-50 font-mono focus-industrial"
      >
        <span className="mobile-menu-control flex h-12 w-12 items-center justify-center border border-white/25 bg-white/5 transition-all duration-300 group-hover:border-brand group-hover:bg-brand group-active:scale-95">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="5" y="8" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="13" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
            <rect x="5" y="18" width="18" height="2.5" rx="1.25" fill="currentColor" className="text-text-1 transition-all duration-500 group-hover:text-brand" />
          </svg>
          <span className="pointer-events-none absolute inset-0 border border-brand/20 transition-all duration-500 group-hover:border-white/70" aria-hidden="true" />
        </span>
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className="mobile-menu-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="relative flex max-h-[calc(100dvh-2rem)] min-h-[26rem] w-full flex-col items-center overflow-y-auto border border-white/25 bg-bg-1 px-8 py-10 shadow-2xl">
          <button
            type="button"
            autoFocus
            className="mobile-menu-control focus-industrial absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center border border-white/25 bg-white/5 transition-all duration-300 hover:border-brand hover:bg-brand active:scale-95"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-1" aria-hidden="true">
              <line x1="6" y1="6" x2="16" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="16" y1="6" x2="6" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <nav className="z-10 flex w-full flex-1 flex-col items-stretch justify-center gap-2 px-2 py-8" aria-label="Mobile primary navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="menu-gradient-link w-full border border-white/20 px-5 py-3 text-left text-xl transition-all focus-industrial md:text-2xl"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
