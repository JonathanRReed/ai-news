import { useCallback, useEffect, useState } from "react";

const SEEN_KEY = "ai-news-seen";
const SAVED_KEY = "ai-news-saved";
const SEEN_CAP = 2000;

function load(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function persist(key: string, set: Set<string>, cap?: number) {
  if (typeof window === "undefined") return;
  try {
    const arr = [...set];
    window.localStorage.setItem(key, JSON.stringify(cap ? arr.slice(-cap) : arr));
  } catch {
    /* storage full or unavailable, non-fatal */
  }
}

export interface ReadState {
  seen: Set<string>;
  saved: Set<string>;
  markSeen: (id: string) => void;
  toggleSaved: (id: string) => void;
  hydrated: boolean;
}

// Durable cross-session memory of what's been opened (seen) and starred (saved).
// SSR-safe: starts empty, hydrates from localStorage after mount.
export function useReadState(): ReadState {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSeen(new Set(load(SEEN_KEY)));
    setSaved(new Set(load(SAVED_KEY)));
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persist(SEEN_KEY, next, SEEN_CAP);
      return next;
    });
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(SAVED_KEY, next);
      return next;
    });
  }, []);

  return { seen, saved, markSeen, toggleSaved, hydrated };
}
