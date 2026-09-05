import React, { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Latest" },
  { href: "/major-updates/", label: "Major updates" },
  { href: "/labs/", label: "Labs and providers" },
  { href: "/harnesses/", label: "Agent tools" },
  { href: "/digest/daily/", label: "News by date" },
  { href: "/stories/", label: "All stories" },
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
        className="eco-icon-btn eco-menu-btn focus-industrial"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
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
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-y-auto border border-white/25 bg-bg-1 p-5 pt-14">
          <button
            type="button"
            autoFocus
            className="eco-icon-btn eco-menu-btn focus-industrial absolute right-4 top-4"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <nav className="flex w-full flex-col divide-y divide-white/10" aria-label="Mobile primary navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="menu-link focus-industrial"
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
