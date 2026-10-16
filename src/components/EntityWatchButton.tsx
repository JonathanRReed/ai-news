import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";

export const WATCHLIST_KEY = "ai-news-entity-watchlist-v1";
export const WATCHLIST_EVENT = "ai-news-watchlist-change";

function readWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function EntityWatchButton({ slug, name }: { slug: string; name: string }) {
  const [saveError, setSaveError] = useState(false);
  const [watched, setWatched] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const update = () => { setWatched(readWatchlist().includes(slug)); setHydrated(true); };
    update();
    window.addEventListener(WATCHLIST_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(WATCHLIST_EVENT, update); window.removeEventListener("storage", update); };
  }, [slug]);

  function toggle() {
    const next = new Set(readWatchlist());
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    try {
      window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...next]));
    } catch {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    setWatched(next.has(slug));
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
  }

  return (
    <>
    <button
      type="button"
      aria-pressed={watched}
      aria-busy={!hydrated}
      disabled={!hydrated}
      data-watch-ready={hydrated ? "true" : "false"}
      onClick={toggle}
      className={cn(watched ? "signal-button" : "ghost-button", "disabled:cursor-wait disabled:opacity-60")}
    >
      {watched ? `Watching ${name}` : `Watch ${name}`}
    </button>
    {saveError && <p role="alert" className="text-sm text-brand-hover">Could not save this watchlist. Browser storage may be blocked or full.</p>}
    </>
  );
}
