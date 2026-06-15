/* global KeyboardEvent */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { countNewerThan } from "../hooks/fetchArticlesPage.js";
import { resolveCompanyLogo } from "../lib/companyCatalog.js";
import { deriveTopics, topicLabel, readingMinutes, importanceScore } from "../lib/articleTags.js";
import type { Article, PageData } from "../types/article.js";
import type { ReadState } from "../hooks/useReadState.js";
import type { FeedView } from "./ArticlesIslandWrapper.js";

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getSafeArticleUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches === true
    : false;
}

function relativeTime(value: string, nowMs: number): string {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "Undated";
  const diff = nowMs - t;
  if (diff < 0) return "Just now";
  const day = 86400000;
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < day) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function timeBucket(value: string, nowMs: number): string {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "Undated";
  // UTC day boundaries so the SSR (build-server tz) and client (user tz) renders agree.
  const n = new Date(nowMs);
  const ms = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  const day = 86400000;
  if (t >= ms) return "Today";
  if (t >= ms - day) return "Yesterday";
  if (t >= ms - 7 * day) return "Earlier this week";
  if (t >= ms - 30 * day) return "This month";
  return "Earlier";
}

function sourceTypeLabel(sourceType?: string): string {
  switch (sourceType) {
    case "rss_official":
      return "Official feed";
    case "rss_unofficial":
      return "Community feed";
    case "scraped":
      return "Indexed page";
    default:
      return "Source feed";
  }
}

function highlightText(text: string, terms: string[]): React.ReactNode {
  if (!terms.length) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "ig");
  const lower = terms.map((t) => t.toLowerCase());
  return text.split(re).map((part, i) =>
    lower.includes(part.toLowerCase())
      ? <mark key={i} className="bg-brand/30 text-white">{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function SavedButton({ saved, onToggle, title }: { saved: boolean; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove “${title}” from saved` : `Save “${title}” for later`}
      className={`flex h-9 w-9 shrink-0 items-center justify-center border transition-colors focus-industrial ${
        saved ? "border-brand text-brand" : "border-white/20 text-text-2 hover:border-white/40 hover:text-white"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-5-8 5V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}

function ArticleCard({
  article,
  tier,
  density,
  nowMs,
  terms,
  seen,
  saved,
  selected,
  onOpen,
  onToggleSaved,
}: {
  article: Article;
  tier: "lead" | "top" | "river";
  density: "comfortable" | "compact";
  nowMs: number;
  terms: string[];
  seen: boolean;
  saved: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleSaved: (id: string) => void;
}) {
  const logoPath = resolveCompanyLogo(article.company);
  const safeUrl = getSafeArticleUrl(article.url);
  const domain = getDomain(article.url);
  const topics = deriveTopics(article).slice(0, 3);
  const minutes = readingMinutes(article);
  const isLead = tier === "lead";
  const showExcerpt = isLead || (tier === "top" && density === "comfortable") || (tier === "river" && density === "comfortable");
  const pad = isLead ? "p-6 md:p-8" : tier === "top" ? "p-5" : density === "compact" ? "p-3.5" : "p-4 md:p-5";
  const titleSize = isLead ? "text-2xl md:text-4xl" : tier === "top" ? "text-xl" : density === "compact" ? "text-base" : "text-lg";
  const Heading = isLead ? "h2" : "h3";

  return (
    <article data-article-id={article.id} className={`article-card-hoverable group relative border border-white/[0.14] bg-bg-0/90 ${pad} ${selected ? "outline outline-2 outline-brand outline-offset-2" : ""} ${seen ? "opacity-60 hover:opacity-100" : ""}`}>
      <div className="mb-3 flex items-center gap-3 border-b border-white/[0.1] pb-3">
        {logoPath && (
          <span className={`flex shrink-0 items-center justify-center border border-white/20 bg-white ${isLead ? "h-11 w-11" : "h-9 w-9"}`}>
            <img src={logoPath} alt="" aria-hidden="true" className={isLead ? "h-8 w-8 object-contain" : "h-6 w-6 object-contain"} loading="lazy" width={isLead ? 32 : 24} height={isLead ? 32 : 24} />
          </span>
        )}
        <span className="micro-label text-white">{article.company}</span>
        {isLead && <span className="micro-label border border-brand px-2 py-0.5 text-brand-hover">Top story</span>}
        <time className="micro-label tabular-nums ml-auto text-text-2" dateTime={article.published_at} title={new Date(article.published_at).toLocaleString()}>
          {relativeTime(article.published_at, nowMs)}
        </time>
        <SavedButton saved={saved} onToggle={() => onToggleSaved(article.id)} title={article.title} />
      </div>

      <Heading className={`${titleSize} mb-2 font-bold leading-tight text-white text-pretty`}>
        {safeUrl ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(article.id)}
            className="decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand-hover hover:underline focus-industrial"
          >
            {highlightText(article.title, terms)}
          </a>
        ) : (
          <span>{highlightText(article.title, terms)}</span>
        )}
      </Heading>

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.68rem] uppercase tracking-[0.06em] text-text-2">
        {domain && <span className="border border-white/15 px-2 py-0.5 text-white">{domain}</span>}
        <span>{sourceTypeLabel(article.source_type)}</span>
        {topics.map((key) => (
          <span key={key} className="text-text-2">· {topicLabel(key)}</span>
        ))}
        {minutes > 0 && <span className="tabular-nums">· {minutes} min read</span>}
      </div>

      {showExcerpt && (article.summary || article.content) && (
        <p className={`${isLead ? "text-base md:text-lg" : "text-sm"} max-w-3xl leading-relaxed text-text-2 text-pretty ${isLead ? "" : "line-clamp-2"}`}>
          {article.summary || article.content}
        </p>
      )}
    </article>
  );
}

export default function ArticleListIsland({
  density = "comfortable",
  view = "all",
  readState,
  now = 0,
}: {
  density?: "comfortable" | "compact";
  view?: FeedView;
  readState: ReadState;
  now?: number;
}) {
  const { data, isFetching, error, fetchNextPage, hasNextPage, filters } = useArticlesContext();
  const { seen, saved, markSeen, toggleSaved } = readState;
  // Seed "now" from a build-time timestamp (prop) so the SSR/crawler render shows real
  // relative times instead of "Just now"; the effect then refreshes to the live clock.
  const [nowMs, setNowMs] = useState(now);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const allArticles = useMemo<Article[]>(() => {
    if (!Array.isArray(data?.pages)) return [];
    const merged = data.pages.reduce((acc: Article[], page: PageData) => (Array.isArray(page?.data) ? acc.concat(page.data) : acc), [] as Article[]);
    const seenIds = new Set<string>();
    const deduped: Article[] = [];
    for (const art of merged) {
      if (!seenIds.has(art.id)) {
        deduped.push(art);
        seenIds.add(art.id);
      }
    }
    return deduped.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }, [data?.pages]);

  const articles = useMemo<Article[]>(() => {
    if (view === "unread") return allArticles.filter((a) => !seen.has(a.id));
    if (view === "saved") return allArticles.filter((a) => saved.has(a.id));
    return allArticles;
  }, [allArticles, view, seen, saved]);

  const [visibleCount, setVisibleCount] = useState(20);
  const [pendingIncrease, setPendingIncrease] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const showHelpRef = useRef(showHelp);

  // Mirror selection + dialog state into refs so the keyboard handler reads the latest
  // values without listing them as deps (avoids rebinding the listener per keystroke).
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);
  useEffect(() => {
    showHelpRef.current = showHelp;
  }, [showHelp]);

  // Reset to the top only when the filter/view actually changes — NOT when data.pages
  // grows from "Load more" (that would wipe the just-appended page).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisibleCount(20);
    setSelectedIndex(-1);
  }, [view, filters.company, filters.q, filters.topics]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleArticles = articles.slice(0, visibleCount);

  // Build editorial tiers from the visible set: a lead + a small top row pulled from
  // the most recent window by a transparent score, then the chronological river.
  const { lead, topPicks, riverGroups } = useMemo(() => {
    const enoughForTiers = view === "all" && visibleArticles.length >= 8;
    if (!enoughForTiers) {
      return { lead: null as Article | null, topPicks: [] as Article[], riverGroups: groupByBucket(visibleArticles, nowMs) };
    }
    const window = visibleArticles.slice(0, 15);
    const ranked = [...window].sort((a, b) => importanceScore(b, nowMs) - importanceScore(a, nowMs));
    const leadArticle = ranked[0] ?? null;
    const tops = ranked.slice(1, 5);
    const promoted = new Set([leadArticle, ...tops].filter(Boolean).map((a) => (a as Article).id));
    const river = visibleArticles.filter((a) => !promoted.has(a.id));
    return { lead: leadArticle, topPicks: tops, riverGroups: groupByBucket(river, nowMs) };
  }, [visibleArticles, view, nowMs]);

  // Flat list in visual order — powers keyboard navigation (j/k/o/s/m).
  const orderedArticles = useMemo<Article[]>(() => {
    const list: Article[] = [];
    if (lead) list.push(lead);
    list.push(...topPicks);
    riverGroups.forEach((group) => list.push(...group.items));
    return list;
  }, [lead, topPicks, riverGroups]);
  const selectedId = selectedIndex >= 0 ? orderedArticles[selectedIndex]?.id : undefined;

  // Keep the keyboard selection in range when the list shrinks (filter/view change, mark-read).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelectedIndex((i) => (i >= orderedArticles.length ? orderedArticles.length - 1 : i));
  }, [orderedArticles.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeFilters = [
    filters.company && filters.company !== "All" ? filters.company : null,
    ...(filters.topics ?? []).map(topicLabel),
    filters.q?.trim() ? `"${filters.q.trim()}"` : null,
    view !== "all" ? view.charAt(0).toUpperCase() + view.slice(1) : null,
  ].filter(Boolean) as string[];

  // Baseline for "new stories" = newest article already loaded (not the view-filtered first
  // item), so Unread/Saved views don't over-count things already in the list.
  const latestLoadedTs = allArticles.length > 0 ? new Date(allArticles[0].published_at).getTime() : 0;
  const loadedLabel = hasNextPage ? `${visibleArticles.length} loaded` : `${visibleArticles.length} total`;
  const searchTerms = (filters.q?.trim().toLowerCase().split(/\s+/).filter(Boolean)) ?? [];

  // Poll for newer items with a cheap server-side COUNT (no rows transferred); pauses when hidden.
  useEffect(() => {
    const checkForNew = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      // The COUNT only scopes by company; don't show a misleading banner while a text
      // search or topic filter is narrowing the feed (those can't be applied server-side).
      if (!latestLoadedTs || filters.q?.trim() || (filters.topics && filters.topics.length)) {
        setNewCount(0);
        return;
      }
      try {
        setNewCount(await countNewerThan(filters, latestLoadedTs));
      } catch {
        /* silent */
      }
    };
    const onVisible = () => {
      if (!document.hidden) checkForNew();
    };
    checkForNew();
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(checkForNew, 60_000) as unknown as number;
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    };
  }, [filters, latestLoadedTs]);

  // Keyboard navigation for power users (j/k move · o open · s save · m mark read · / search · ? help).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || "").toLowerCase();
      // While the shortcuts dialog is open, only Escape acts (closes it); swallow the rest so
      // they don't reach the background article (focus sits on the dialog div, not a control).
      if (showHelpRef.current) {
        if (e.key === "Escape") {
          setShowHelp(false);
          setSelectedIndex(-1);
        }
        return;
      }
      // Let interactive controls keep their own keys (Enter activates them, arrows scroll/move
      // focus) instead of also firing an article shortcut.
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" || tag === "a" || target?.isContentEditable) {
        if (e.key === "Escape") target?.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = orderedArticles.length;
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(n - 1, i + 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i <= 0 ? 0 : i - 1));
          break;
        case "o":
        case "Enter": {
          const a = orderedArticles[selectedIndexRef.current];
          const url = a ? getSafeArticleUrl(a.url) : "";
          if (a && url) {
            markSeen(a.id);
            window.open(url, "_blank", "noopener");
          }
          break;
        }
        case "s": {
          const a = orderedArticles[selectedIndexRef.current];
          if (a) toggleSaved(a.id);
          break;
        }
        case "m": {
          const a = orderedArticles[selectedIndexRef.current];
          if (a) markSeen(a.id);
          break;
        }
        case "/":
          e.preventDefault();
          document.getElementById("article-search")?.focus();
          break;
        case "?":
          e.preventDefault();
          setShowHelp((h) => !h);
          break;
        case "Escape":
          setShowHelp(false);
          setSelectedIndex(-1);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [orderedArticles, markSeen, toggleSaved]);

  // Scroll the selected card into view only when the selection actually changes
  // (selectedId is stable across the 60s nowMs ticks, unlike orderedArticles' identity).
  useEffect(() => {
    if (!selectedId) return;
    const el = document.querySelector(`[data-article-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selectedId]);

  // Focus management for the shortcuts dialog: move focus in, trap Tab, restore on close.
  useEffect(() => {
    if (!showHelp) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap, true);
    return () => {
      document.removeEventListener("keydown", trap, true);
      restoreFocusRef.current?.focus();
    };
  }, [showHelp]);

  if (error) {
    return (
      <div className="mt-8 border border-brand bg-bg-1 p-6">
        <p className="micro-label mb-3 text-brand-hover">Couldn&apos;t load the live feed</p>
        <p className="max-w-2xl text-base leading-relaxed text-text-2">
          The live connection dropped. Cached stories will load again as soon as it recovers — try refreshing in a moment.
        </p>
      </div>
    );
  }

  if (!isFetching && visibleArticles.length === 0) {
    const reason =
      view === "saved"
        ? "You haven't saved any stories yet. Tap the bookmark on a card to keep it here."
        : view === "unread"
          ? "You're all caught up — every loaded story has been opened."
          : "Try a different lab, topic or search term.";
    return (
      <div className="mt-8 border border-white/20 bg-bg-1 p-8">
        <p className="micro-label mb-3 text-white">Nothing to show here</p>
        <p className="max-w-2xl text-base leading-relaxed text-text-2">{reason}</p>
        {hasNextPage && (
          <button
            className="signal-button mt-6 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={pendingIncrease}
            onClick={async () => {
              setPendingIncrease(true);
              await fetchNextPage();
              setPendingIncrease(false);
              setVisibleCount((c) => c + 20);
            }}
          >
            {pendingIncrease ? "Loading…" : "Load more to keep looking"}
          </button>
        )}
      </div>
    );
  }

  const skeletons = (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="mb-4 animate-pulse border border-white/15 bg-bg-1 p-6">
          <div className="mb-3 h-4 w-40 bg-white/10"></div>
          <div className="mb-2 h-7 w-3/4 bg-white/10"></div>
          <div className="h-4 w-2/3 bg-white/10"></div>
        </div>
      ))}
    </>
  );

  const cardProps = (article: Article, tier: "lead" | "top" | "river") => ({
    article,
    tier,
    density,
    nowMs,
    terms: searchTerms,
    seen: seen.has(article.id),
    saved: saved.has(article.id),
    selected: article.id === selectedId,
    onOpen: markSeen,
    onToggleSaved: toggleSaved,
  });

  return (
    <>
      <div className="mb-5 grid gap-px bg-white/15 md:grid-cols-[1fr_auto_auto]">
        <div className="bg-bg-1 p-4">
          <p className="micro-label text-text-2">Scope</p>
          <p className="mt-2 text-sm leading-relaxed text-white">
            {activeFilters.length > 0 ? activeFilters.join(" / ") : "All tracked sources"}
          </p>
        </div>
        <div className="bg-bg-1 p-4 md:min-w-44">
          <p className="micro-label text-text-2">{searchTerms.length ? "Results" : "Showing"}</p>
          <p className="mt-2 font-mono text-sm tabular-nums text-white">{loadedLabel}</p>
        </div>
        <div className="bg-bg-1 p-4 md:min-w-48">
          <p className="micro-label text-text-2">Latest</p>
          <p className="mt-2 font-mono text-sm tabular-nums text-white">
            {visibleArticles.length > 0 ? relativeTime(visibleArticles[0].published_at, nowMs) : "No matches"}
          </p>
        </div>
      </div>

      {isFetching && visibleArticles.length === 0 ? (
        skeletons
      ) : (
        <div className="space-y-8">
          {lead && (
            <div>{<ArticleCard {...cardProps(lead, "lead")} />}</div>
          )}

          {topPicks.length > 0 && (
            <div>
              <h2 className="micro-label mb-3 text-text-2">Top stories</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {topPicks.map((article) => (
                  <ArticleCard key={article.id} {...cardProps(article, "top")} />
                ))}
              </div>
            </div>
          )}

          {riverGroups.map((group) => (
            <div key={group.bucket}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="micro-label text-text-2">{group.bucket}</h2>
                <span className="h-px flex-1 bg-white/10" aria-hidden="true"></span>
                <span className="micro-label tabular-nums text-muted">{group.items.length}</span>
              </div>
              <div className="space-y-3">
                {group.items.map((article) => (
                  <ArticleCard key={article.id} {...cardProps(article, "river")} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {newCount > 0 && (
        <div role="status" aria-live="polite" className="fixed left-1/2 top-[84px] z-40 -translate-x-1/2 border border-brand bg-bg-1 px-4 py-2 shadow-md">
          <span className="micro-label tabular-nums text-white">{newCount} new {newCount === 1 ? "story" : "stories"} available</span>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          className={`signal-button transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30 ${pendingIncrease ? "opacity-80" : ""}`}
          onClick={async () => {
            if (visibleCount + 20 > articles.length && hasNextPage) {
              setPendingIncrease(true);
              await fetchNextPage();
              setPendingIncrease(false);
            }
            setVisibleCount((c) => c + 20);
          }}
          disabled={pendingIncrease || (!hasNextPage && visibleCount >= articles.length)}
        >
          {pendingIncrease ? (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle"></span>
          ) : null}
          {pendingIncrease ? "Loading…" : !hasNextPage && visibleCount >= articles.length ? "All caught up" : "Load 20 more"}
        </button>
      </div>

      <p className="mt-4 hidden text-center font-mono text-xs text-muted md:block">
        Press{" "}
        <kbd className="border border-white/20 px-1.5 py-0.5 text-text-2">?</kbd>{" "}
        for keyboard shortcuts
      </p>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setShowHelp(false)}
        >
          <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md border border-white/20 bg-bg-1 p-6 focus:outline-none" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
              <p className="micro-label text-white">Keyboard shortcuts</p>
              <button className="micro-label text-text-2 transition-colors hover:text-white focus-industrial" onClick={() => setShowHelp(false)} aria-label="Close shortcuts">
                Esc
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm text-text-2">
              {[
                ["j / ↓", "Next story"],
                ["k / ↑", "Previous story"],
                ["o / ↵", "Open the source"],
                ["s", "Save or unsave"],
                ["m", "Mark as read"],
                ["/", "Focus search"],
                ["?", "Toggle this panel"],
                ["Esc", "Clear or close"],
              ].map(([key, label]) => (
                <React.Fragment key={key}>
                  <dt><kbd className="border border-white/20 px-2 py-0.5 font-mono text-xs text-white">{key}</kbd></dt>
                  <dd className="self-center">{label}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      )}

      {visibleCount > 20 && (
        <button
          className="ghost-button fixed bottom-6 right-6 z-40 bg-bg-1"
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
          aria-label="Back to top"
        >
          Top
        </button>
      )}
    </>
  );
}

function groupByBucket(articles: Article[], nowMs: number): { bucket: string; items: Article[] }[] {
  const order = ["Today", "Yesterday", "Earlier this week", "This month", "Earlier", "Undated"];
  const map = new Map<string, Article[]>();
  for (const article of articles) {
    const bucket = timeBucket(article.published_at, nowMs);
    const list = map.get(bucket) ?? [];
    list.push(article);
    map.set(bucket, list);
  }
  return order.filter((b) => map.has(b)).map((bucket) => ({ bucket, items: map.get(bucket) as Article[] }));
}
