/* global KeyboardEvent */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PublisherText from "./PublisherText.js";
import { admittedArticles, articleSourceRouteIndex } from "../lib/articleAdmission.js";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { countNewerThan, fetchSavedArticles } from "../hooks/fetchArticlesPage.js";
import { companyLogoAlt, resolveCompanyLogo } from "../lib/companyCatalog.js";
import { topicLabel } from "../lib/articleTags.js";
import type { Article, PageData } from "../types/article.js";
import type { ReadState } from "../hooks/useReadState.js";
import type { FeedKind, FeedView } from "./ArticlesIslandWrapper.js";
import { boundedSearchTerms, matchesArticleFilters } from "../lib/intelligenceClient.js";
import { truncateArticleExcerpt } from "../lib/articleExcerpt.js";
import { articlePath } from "../lib/articleRoutes.js";
import { unavailableArticleSource } from "../lib/articleSourceAvailability.mjs";
import { itemTypeLabel } from "../lib/itemTypes.js";
import { cn } from "../lib/utils.js";
import { feedDayLabel, groupFeedDays, rowExcerpt, UNDATED_DAY, utcClockTime, type BuildGroupFeedRow } from "../lib/feedRows.js";
import { buildGroupLabel, recordDisplayTitle, recordKind, recordKindLabel, releaseTag, titleNeedsProject, type RecordKind } from "../lib/releaseKind.js";
import { classifyMajorUpdate } from "../lib/majorUpdates.js";

const EXPANDED_PREVIEW_MAX_LENGTH = 1_600;

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
  return new Date(t).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

// Official feeds are the default, so only the exceptions are spelled out on a row.
function provenanceLabel(sourceType?: string): string | null {
  switch (sourceType) {
    case "rss_unofficial":
      return "Community feed";
    case "scraped":
      return "Indexed page";
    default:
      return null;
  }
}

const ExternalIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
    <path d="M4.5 2.5h5v5" />
    <path d="M9.5 2.5 2.5 9.5" />
  </svg>
);

function highlightText(text: string, terms: string[]): React.ReactNode {
  if (!terms.length) return <PublisherText text={text} />;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "ig");
  const lower = terms.map((t) => t.toLowerCase());
  return text.split(re).map((part, i) =>
    lower.includes(part.toLowerCase())
      ? <mark key={i} className="bg-brand/30 text-white"><PublisherText text={part} /></mark>
      : <React.Fragment key={i}><PublisherText text={part} /></React.Fragment>
  );
}

function SavedButton({ saved, onToggle, title }: { saved: boolean; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove “${title}” from saved` : `Save “${title}” for later`}
      className="feed-save focus-industrial"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-5-8 5V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}

function RowTitle({ article, kind, terms }: { article: Article; kind: RecordKind; terms: string[] }) {
  if (kind === "story") return <>{highlightText(article.title, terms)}</>;
  return (
    <>
      {titleNeedsProject(article) && <><span className="feed-title-project">{article.company}</span>{" "}</>}
      <span className="feed-version">{highlightText(article.title, terms)}</span>
    </>
  );
}

function FeedArticleRow({
  article,
  density,
  terms,
  seen,
  saved,
  selected,
  eager,
  onOpen,
  onToggleSaved,
}: {
  article: Article;
  density: "comfortable" | "compact";
  terms: string[];
  seen: boolean;
  saved: boolean;
  selected: boolean;
  eager: boolean;
  onOpen: (id: string) => void;
  onToggleSaved: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const logoPath = resolveCompanyLogo(article.company);
  const sourceUnavailable = Boolean(unavailableArticleSource(article.url));
  const safeUrl = sourceUnavailable ? "" : getSafeArticleUrl(article.url);
  const localUrl = articlePath(article.id);
  const domain = getDomain(article.url);
  const kind = recordKind(article);
  const major = classifyMajorUpdate(article);
  // The deterministic kind wins for builds, so a live row and a static row read the same.
  const typeLabel = kind === "build" ? recordKindLabel(kind, article) : itemTypeLabel(article.item_type) ?? recordKindLabel(kind, article);
  const displayTitle = recordDisplayTitle(article);
  const provenance = provenanceLabel(article.source_type);
  const excerpt = rowExcerpt(article);
  const showExcerpt = density === "comfortable" && Boolean(excerpt);
  const expandedExcerpt = truncateArticleExcerpt(
    article.content || article.summary || "",
    EXPANDED_PREVIEW_MAX_LENGTH,
  );
  const hasMoreExcerpt = expandedExcerpt.length > excerpt.length;
  const previewId = `article-preview-${article.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const clock = utcClockTime(article.published_at);

  return (
    <article
      data-article-id={article.id}
      data-kind={kind}
      data-density={density}
      data-seen={seen}
      data-selected={selected}
      className="feed-row"
    >
      <span className="feed-logo">
        <img src={logoPath} alt={companyLogoAlt(article.company)} loading={eager ? "eager" : "lazy"} decoding="async" width={22} height={22} />
      </span>

      <div className="feed-body min-w-0">
        <p className="feed-meta">
          {clock && (
            <time className="feed-time" dateTime={article.published_at}>
              {clock}
            </time>
          )}
          <span className="feed-publisher">{article.company}</span>
          {major && <span className="feed-major">Major update<span className="sr-only">: {major.reason}</span></span>}
          {typeLabel && <span>{typeLabel}</span>}
          {provenance && <span>{provenance}</span>}
        </p>

        <h3 className="feed-title">
          {localUrl ? (
            <a href={localUrl} onClick={() => onOpen(article.id)} className="focus-industrial">
              <RowTitle article={article} kind={kind} terms={terms} />
            </a>
          ) : (
            <RowTitle article={article} kind={kind} terms={terms} />
          )}
        </h3>

        {showExcerpt && (
          <>
            <p id={previewId} className={cn("feed-excerpt", !expanded && "line-clamp-2")}>
              {expanded ? <PublisherText text={expandedExcerpt} /> : highlightText(excerpt, terms)}
            </p>
            {hasMoreExcerpt && (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-text-2 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-brand focus-industrial"
                aria-expanded={expanded}
                aria-controls={previewId}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Collapse preview" : "Expand preview"}
              </button>
            )}
          </>
        )}

        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(article.id)}
            className="feed-source focus-industrial"
            aria-label={`Original source${domain ? ` on ${domain}` : ""} for “${displayTitle}”`}
          >
            {domain || "Original source"}
            <ExternalIcon />
          </a>
        )}
        {sourceUnavailable && <span className="feed-source feed-source-missing">Source unavailable</span>}
      </div>

      <SavedButton saved={saved} onToggle={() => onToggleSaved(article.id)} title={displayTitle} />
    </article>
  );
}

function BuildGroupRow({
  group,
  open,
  selectedId,
  onToggle,
  onOpen,
}: {
  group: BuildGroupFeedRow;
  open: boolean;
  selectedId?: string;
  onToggle: () => void;
  onOpen: (id: string) => void;
}) {
  const { company, articles } = group;
  const newest = articles[0];
  const listId = `build-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const tags = articles.slice(0, 2).map((article) => releaseTag(article.title));

  return (
    <div className="feed-builds" data-build-group={group.key}>
      <span className="feed-builds-time" aria-hidden="true">{utcClockTime(newest.published_at)}</span>
      <button
        type="button"
        className="feed-builds-toggle focus-industrial"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={onToggle}
      >
        <span className="feed-logo">
          <img src={resolveCompanyLogo(company)} alt="" loading="lazy" decoding="async" width={16} height={16} />
        </span>
        <span className="feed-builds-summary">
          <span>
            <span className="feed-publisher">{company}</span>
            {" "}
            <span className="tabular-nums">{buildGroupLabel(articles)}</span>
          </span>
          <span className="feed-builds-range">
            <PublisherText text={tags.join(", ")} />
            {articles.length > tags.length && ` and ${articles.length - tags.length} more`}
          </span>
        </span>
        <svg className="feed-builds-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul id={listId} className="feed-builds-list">
          {articles.map((article) => {
            const safeUrl = unavailableArticleSource(article.url) ? "" : getSafeArticleUrl(article.url);
            return (
              <li key={article.id} data-article-id={article.id} data-selected={article.id === selectedId}>
                <time className="feed-time" dateTime={article.published_at}>
                  {utcClockTime(article.published_at)}
                </time>
                <a href={articlePath(article.id)} onClick={() => onOpen(article.id)} className="feed-version focus-industrial">
                  <PublisherText text={article.title} />
                </a>
                {safeUrl && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onOpen(article.id)}
                    className="feed-source focus-industrial text-xs"
                    aria-label={`Original source for ${company} ${article.title}`}
                  >
                    Source
                    <ExternalIcon />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ArticleListIsland({
  density = "comfortable",
  view = "all",
  kind = "all",
  readState,
  now = 0,
  archiveDays = [],
  onClearFilters,
}: {
  density?: "comfortable" | "compact";
  view?: FeedView;
  kind?: FeedKind;
  readState: ReadState;
  now?: number;
  /** UTC days that have a published /digest/daily/ page, newest first. */
  archiveDays?: string[];
  onClearFilters: () => void;
}) {
  const { data, isFetching, error, fetchNextPage, hasNextPage, refetch, filters } = useArticlesContext();
  const { seen, saved, markSeen, toggleSaved: toggleSavedRoute } = readState;
  const savedArchiveKey = JSON.stringify([...saved].sort());
  const [loadedSavedArchiveKey, setLoadedSavedArchiveKey] = useState<string | null>(null);
  const savedArchiveLoading = view === "saved" && saved.size > 0 && loadedSavedArchiveKey !== savedArchiveKey;
  const [savedArchiveArticles, setSavedArchiveArticles] = useState<Article[]>([]);
  // Seed "now" from a build-time timestamp (prop) so the SSR/crawler render shows real
  // relative times instead of "Just now"; the effect then refreshes to the live clock.
  const [nowMs, setNowMs] = useState(now);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const loadedArticles = useMemo<Article[]>(() => {
    if (!Array.isArray(data?.pages)) return [];
    return data.pages.reduce((acc: Article[], page: PageData) => (Array.isArray(page?.data) ? acc.concat(page.data) : acc), [] as Article[])
      .concat(view === "saved" ? savedArchiveArticles : []);
  }, [data?.pages, savedArchiveArticles, view]);

  const allArticles = useMemo<Article[]>(() => {
    const seenIds = new Set<string>();
    const deduped: Article[] = [];
    for (const art of loadedArticles) {
      if (!seenIds.has(art.id)) {
        deduped.push(art);
        seenIds.add(art.id);
      }
    }
    return admittedArticles(deduped, { includeInternalBuilds: view === "saved" }).filter(article => view !== "saved" || matchesArticleFilters(article, filters)).sort((a, b) => (
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      || b.id.localeCompare(a.id)
    ));
  }, [loadedArticles, view, filters]);

  const sourceRouteIds = useMemo(() => articleSourceRouteIndex(loadedArticles), [loadedArticles]);

  const toggleSaved = useCallback((id: string) => {
    const savedIds = (sourceRouteIds.get(id) ?? [id]).filter((routeId) => saved.has(routeId));
    for (const routeId of savedIds.length ? savedIds : [id]) toggleSavedRoute(routeId);
  }, [sourceRouteIds, saved, toggleSavedRoute]);

  useEffect(() => {
    if (view !== "saved" || savedArchiveKey === "[]") return;
    let cancelled = false;
    fetchSavedArticles(JSON.parse(savedArchiveKey) as string[]).then((articles) => {
      if (!cancelled) { setSavedArchiveArticles(articles); setLoadedSavedArchiveKey(savedArchiveKey); }
    });
    return () => {
      cancelled = true;
    };
  }, [savedArchiveKey, view]);

  const dataState = useMemo(() => {
    const pages = data?.pages ?? [];
    if (pages.some((page) => page.state === "degraded")) return "degraded";
    return pages.at(-1)?.state ?? "static";
  }, [data?.pages]);
  const cacheFreshness = useMemo(() => (
    (data?.pages ?? []).find((page) => page.cacheFreshness)?.cacheFreshness ?? null
  ), [data?.pages]);
  const newestPublishedLabel = cacheFreshness
    ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(cacheFreshness))
    : "the latest successful export";

  const articles = useMemo<Article[]>(() => {
    const routeIds = (a: Article) => sourceRouteIds.get(a.id) ?? [a.id];
    const ofKind = kind === "all"
      ? allArticles
      : allArticles.filter((a) => (recordKind(a) === "story") === (kind === "news"));
    if (view === "unread") return ofKind.filter((a) => !routeIds(a).some((id) => seen.has(id)));
    if (view === "saved") return ofKind.filter((a) => routeIds(a).some((id) => saved.has(id)));
    return ofKind;
  }, [allArticles, view, kind, seen, saved, sourceRouteIds]);

  const [visibleCount, setVisibleCount] = useState(20);
  const [pendingIncrease, setPendingIncrease] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [pendingNewStories, setPendingNewStories] = useState(false);
  const [newStoriesDismissed, setNewStoriesDismissed] = useState(false);
  // The selection is a record, not a position: opening a build group above it must not move it.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const pollTimer = useRef<number | null>(null);
  const selectedKeyRef = useRef(selectedKey);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const showHelpRef = useRef(showHelp);

  // Mirror selection + dialog state into refs so the keyboard handler reads the latest
  // values without listing them as deps (avoids rebinding the listener per keystroke).
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);
  useEffect(() => {
    showHelpRef.current = showHelp;
  }, [showHelp]);

  // Reset to the top only when the filter/view actually changes, not when data.pages
  // grows from "Load more" (that would wipe the just-appended page).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisibleCount(20);
    setSelectedKey(null);
  }, [view, kind, filters.company, filters.q, filters.topics]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleArticles = articles.slice(0, visibleCount);

  // The ledger is strictly chronological: UTC days, newest first. The only folding is
  // deterministic, one project's pre-release builds on one day, and every member stays listed.
  // Saved is a personal list: a build someone bookmarked is shown as its own row there.
  const feedDays = useMemo(() => groupFeedDays(visibleArticles, { foldBuilds: view !== "saved" }), [visibleArticles, view]);
  const archiveDaySet = useMemo(() => new Set(archiveDays), [archiveDays]);
  const toggleGroup = (key: string) => setOpenGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  // Flat list in visual order, powers keyboard navigation (j/k/o/s/m). Folded builds
  // are skipped until their group is opened.
  const orderedArticles = useMemo<Article[]>(() => {
    const list: Article[] = [];
    for (const day of feedDays) {
      for (const row of day.rows) {
        if (row.type === "article") list.push(row.article);
        else if (openGroups.has(row.key)) list.push(...row.articles);
      }
    }
    return list;
  }, [feedDays, openGroups]);
  // A selection whose record left the list (filter change, group closed) simply stops showing.
  const selectedId = selectedKey && orderedArticles.some((article) => article.id === selectedKey) ? selectedKey : undefined;

  const activeFilters = [
    filters.company && filters.company !== "All" ? filters.company : null,
    ...(filters.topics ?? []).map(topicLabel),
    filters.q?.trim() ? `"${filters.q.trim()}"` : null,
    kind === "news" ? "News only" : kind === "releases" ? "Software releases only" : null,
    view !== "all" ? view.charAt(0).toUpperCase() + view.slice(1) : null,
  ].filter(Boolean) as string[];

  // Baseline for "new stories" = newest article already loaded (not the view-filtered first
  // item), so Unread/Saved views don't over-count things already in the list.
  const latestLoadedTs = allArticles.length > 0 ? new Date(allArticles[0].published_at).getTime() : 0;
  const canFetchNextPage = view !== "saved" && hasNextPage;
  const loadedLabel = canFetchNextPage ? `${visibleArticles.length} loaded` : `${visibleArticles.length} total`;
  const searchTerms = boundedSearchTerms(filters.q);

  // A rejected page fetch must never leave the button stuck on its loading label, so the
  // pending flag is cleared in a finally and the failure gets a visible line of its own.
  const loadMoreStories = async () => {
    const needsFetch = canFetchNextPage && visibleCount + 20 > articles.length;
    if (!needsFetch) {
      setVisibleCount((c) => c + 20);
      return;
    }
    setLoadMoreError(false);
    setPendingIncrease(true);
    try {
      await fetchNextPage({ throwOnError: true });
      setVisibleCount((c) => c + 20);
    } catch {
      setLoadMoreError(true);
    } finally {
      setPendingIncrease(false);
    }
  };

  const loadNewStories = async () => {
    setLoadMoreError(false);
    setPendingNewStories(true);
    try {
      await refetch({ throwOnError: true });
      setNewCount(0);
    } catch {
      setLoadMoreError(true);
    } finally {
      setPendingNewStories(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNewStoriesDismissed(false);
  }, [newCount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Poll for newer items with a cheap server-side COUNT (no rows transferred); pauses when hidden.
  useEffect(() => {
    const checkForNew = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      // The COUNT only scopes by company; don't show a misleading banner while a text
      // search, topic or record-type filter is narrowing the feed (those can't be applied server-side).
      if (!latestLoadedTs || kind !== "all" || filters.q?.trim() || (filters.topics && filters.topics.length)) {
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
  }, [filters, kind, latestLoadedTs]);

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
          setSelectedKey(null);
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
      const indexOf = (id: string | null) => orderedArticles.findIndex((article) => article.id === id);
      const selectedArticle = () => orderedArticles.find((article) => article.id === selectedKeyRef.current);
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSelectedKey((current) => orderedArticles[Math.min(n - 1, indexOf(current) + 1)]?.id ?? null);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSelectedKey((current) => orderedArticles[Math.max(0, indexOf(current) - 1)]?.id ?? null);
          break;
        case "o":
        case "Enter": {
          const a = selectedArticle();
          const url = a ? articlePath(a.id) : "";
          if (a && url) {
            markSeen(a.id);
            window.location.assign(url);
          }
          break;
        }
        case "s": {
          const a = selectedArticle();
          if (a) toggleSaved(a.id);
          break;
        }
        case "m": {
          const a = selectedArticle();
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
          setSelectedKey(null);
          setNewStoriesDismissed(true);
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

  // Native modal semantics provide the focus trap, Escape handling and focus restoration.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showHelp && !dialog.open) dialog.showModal();
    if (!showHelp && dialog.open) dialog.close();
  }, [showHelp]);

  useEffect(() => {
    if (!showHelp) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [showHelp]);

  if (error) {
    return (
      <div className="mt-8 border border-brand bg-bg-1 p-6">
        <p className="micro-label mb-3 text-brand-hover">Couldn&apos;t load the live feed</p>
        <p className="max-w-2xl text-base leading-relaxed text-text-2">
          The current feed could not be loaded. Refresh in a moment, or browse <a className="text-white underline decoration-brand decoration-2 underline-offset-4 hover:text-brand-hover focus-industrial" href="/digest/daily/">News by date</a> for stories included in the latest published snapshot.
        </p>
      </div>
    );
  }

  if (view === "saved" && savedArchiveLoading && visibleArticles.length === 0) {
    return <p role="status" className="industrial-border p-6 text-text-2">Loading saved stories…</p>;
  }

  if (!isFetching && visibleArticles.length === 0) {
    const reason =
      view === "saved"
        ? saved.size === 0 ? "You haven't saved any stories yet. Tap the bookmark on a card to keep it here." : "No saved stories are available in this view. Clear filters or try again later."
        : view === "unread"
          ? "You're all caught up. Every loaded story has been opened."
          : kind !== "all"
            ? `No ${kind === "news" ? "news stories" : "software releases"} in the stories loaded so far.`
            : "Try a different lab, topic or search term.";
    return (
      <div className="mt-8 border border-white/20 bg-bg-1 p-8">
        <p className="micro-label mb-3 text-white">Nothing to show here</p>
        <p className="max-w-2xl text-base leading-relaxed text-text-2">{reason}</p>
        {activeFilters.length > 0 && (
          <button type="button" className="ghost-button mt-6" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
        {canFetchNextPage && (
          <>
            <button
              className="signal-button mt-6 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pendingIncrease}
              onClick={loadMoreStories}
            >
              {pendingIncrease ? "Loading…" : "Load more to keep looking"}
            </button>
            {loadMoreError && (
              <p role="alert" className="mt-3 text-sm leading-relaxed text-brand-hover">
                More stories could not be loaded. Try again in a moment.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  const skeletons = (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse border-b border-white/10 py-5">
          <div className="mb-3 h-4 w-40 bg-white/10"></div>
          <div className="mb-2 h-7 w-3/4 bg-white/10"></div>
          <div className="h-4 w-2/3 bg-white/10"></div>
        </div>
      ))}
    </>
  );

  const eagerIds = new Set(visibleArticles.slice(0, 6).map((article) => article.id));
  const anyRoute = (id: string, set: Set<string>) => (sourceRouteIds.get(id) ?? [id]).some((routeId) => set.has(routeId));

  return (
    <>
      {(dataState === "degraded" || dataState === "unconfigured") && (
        <div role="status" className="mb-5 border border-brand/60 bg-brand/10 p-4 text-sm leading-relaxed text-white">
          <span className="micro-label mr-2 text-brand-hover">Published snapshot</span>
          Current updates are temporarily unavailable. The newest story in this published snapshot is dated {newestPublishedLabel}.
        </div>
      )}
      <p className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-text-2">
        <span>
          <span className="font-semibold text-white">{activeFilters.length > 0 ? activeFilters.join(" / ") : "All tracked sources"}</span>
          {visibleArticles.length > 0 && <>, newest {relativeTime(visibleArticles[0].published_at, nowMs)}</>}
        </span>
        <span className="font-mono tabular-nums">
          {searchTerms.length ? `${loadedLabel.replace("loaded", "matches loaded")}` : loadedLabel}, times in UTC
        </span>
      </p>

      {isFetching && visibleArticles.length === 0 ? (
        skeletons
      ) : (
        <div>
          {feedDays.map((day) => (
            <section key={day.day} className="feed-day" aria-label={feedDayLabel(day.day, nowMs)}>
              <div className="feed-day-head">
                <h2 className="feed-day-title">{feedDayLabel(day.day, nowMs)}</h2>
                {day.day !== UNDATED_DAY && archiveDaySet.has(day.day) && (
                  <a href={`/digest/daily/${day.day}/`} className="rail-link focus-industrial">
                    Full day
                  </a>
                )}
              </div>
              {day.rows.map((row) => (
                row.type === "article" ? (
                  <FeedArticleRow
                    key={row.article.id}
                    article={row.article}
                    density={density}
                    terms={searchTerms}
                    seen={anyRoute(row.article.id, seen)}
                    saved={anyRoute(row.article.id, saved)}
                    selected={row.article.id === selectedId}
                    eager={eagerIds.has(row.article.id)}
                    onOpen={markSeen}
                    onToggleSaved={toggleSaved}
                  />
                ) : (
                  <BuildGroupRow
                    key={row.key}
                    group={row}
                    open={openGroups.has(row.key)}
                    selectedId={selectedId}
                    onToggle={() => toggleGroup(row.key)}
                    onOpen={markSeen}
                  />
                )
              ))}
            </section>
          ))}
        </div>
      )}

      {newCount > 0 && !newStoriesDismissed && (
        <div role="status" aria-live="polite" className="fixed left-1/2 z-40 -translate-x-1/2" style={{ top: "calc(var(--header-h) + var(--space-4))" }}>
          <button
            type="button"
            onClick={loadNewStories}
            onKeyDown={(event) => {
              // The global handler ignores Escape while a button holds focus, so dismiss here too.
              if (event.key === "Escape") setNewStoriesDismissed(true);
            }}
            disabled={pendingNewStories}
            className="focus-industrial flex min-h-[var(--control-h)] items-center gap-2 border border-brand/40 bg-bg-1/85 px-4 py-2 backdrop-blur-glass transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
            style={{ boxShadow: "var(--shadow-1)" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse bg-brand" aria-hidden="true"></span>
            <span className="micro-label tabular-nums text-white">
              {pendingNewStories
                ? "Loading new stories…"
                : `Load ${newCount} new ${newCount === 1 ? "story" : "stories"}`}
            </span>
          </button>
          <p className="micro-label mt-1 text-center text-text-2">Press Esc to dismiss</p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center">
        <button
          className={cn(
            "signal-button transition-all duration-[var(--dur-base)] ease-[var(--ease-standard)] disabled:cursor-not-allowed disabled:opacity-30",
            pendingIncrease && "opacity-80",
          )}
          onClick={loadMoreStories}
          disabled={pendingIncrease || (!canFetchNextPage && visibleCount >= articles.length)}
        >
          {pendingIncrease ? (
            <span className="mr-2 inline-block h-4 w-4 animate-spin border-2 border-white/30 border-t-white align-middle"></span>
          ) : null}
          {pendingIncrease ? "Loading…" : !canFetchNextPage && visibleCount >= articles.length ? "All caught up" : "Load 20 more"}
        </button>
        {loadMoreError && (
          <p role="alert" className="mt-3 text-sm leading-relaxed text-brand-hover">
            More stories could not be loaded. Try again in a moment.
          </p>
        )}
      </div>

      <div className="mt-4 hidden text-center md:block">
        <button type="button" className="font-mono text-xs text-text-2 transition-colors hover:text-white focus-industrial" onClick={() => setShowHelp(true)}>
          <kbd className="mr-1.5 border border-white/20 px-1.5 py-0.5 text-text-2">?</kbd>
          Keyboard shortcuts
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="shortcuts-dialog border border-white/20 bg-bg-1 p-6"
        aria-label="Keyboard shortcuts"
        onCancel={(event) => {
          event.preventDefault();
          setShowHelp(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setShowHelp(false);
        }}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
          <p className="micro-label text-white">Keyboard shortcuts</p>
          <button type="button" className="micro-label text-text-2 transition-colors hover:text-white focus-industrial" onClick={() => setShowHelp(false)} aria-label="Close shortcuts">
            Esc
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm text-text-2">
          {[
            ["j / ↓", "Next story"],
            ["k / ↑", "Previous story"],
            ["o / ↵", "Open the story page"],
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
      </dialog>

      {visibleCount > 20 && (
        <button
          className="ghost-button back-to-top fixed bottom-6 right-6 z-40"
          onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
          aria-label="Back to top"
        >
          Top
        </button>
      )}
    </>
  );
}
