import React, { useState, useEffect, useRef, useMemo } from "react";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { fetchArticlesPage } from "../hooks/fetchArticlesPage.js";
import { resolveCompanyLogo } from "../lib/companyCatalog.js";
import type { Article, PageData } from "../types/article.js";

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Article type imported from ../types/article

import SpotlightCard from "./SpotlightCard.js";

function ArticleCard({ article, density = 'comfortable' }: { article: Article, density?: 'comfortable' | 'compact' }) {
  const logoPath = resolveCompanyLogo(article.company);
  const pad = density === 'compact' ? 'p-4' : 'p-5 md:p-6';
  const title = density === 'compact' ? 'text-lg' : 'text-xl md:text-2xl';
  const meta = density === 'compact' ? 'text-[0.68rem]' : 'text-xs';
  const publishedDate = new Date(article.published_at);
  return (
    <SpotlightCard
      className={`article-card-hoverable group mb-4 ${pad}`}
      borderColor="rgba(234,234,234,0.22)"
      spotlightColor="rgba(230,25,25,0.26)"
      backgroundColor="rgba(10,10,10,0.9)"
    >
      <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/15 pb-3">
        {logoPath && (
          <span className="flex h-9 w-9 items-center justify-center border border-white/20 bg-white">
            <img src={logoPath} alt={article.company + ' logo'} className="h-6 w-6 object-contain grayscale contrast-125" loading="lazy" width="24" height="24" />
          </span>
        )}
        <span className="micro-label text-white">{article.company}</span>
        <time className="micro-label text-text-2" dateTime={article.published_at}>
          {publishedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </time>
      </div>
      <h3 className={`${title} mb-3 font-bold leading-tight text-white text-pretty`}>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="decoration-brand decoration-2 underline-offset-4 transition-colors hover:text-brand-hover hover:underline focus-industrial">
          {article.title}
        </a>
      </h3>
      <div className={`mb-3 flex flex-wrap items-center gap-2 font-mono uppercase tracking-[0.08em] text-text-2 ${meta}`}>
        {getDomain(article.url) && (
          <span className="border border-white/20 px-2 py-1 text-white">{getDomain(article.url)}</span>
        )}
        {article.source_type ? <span>[ {article.source_type} ]</span> : null}
      </div>
      <p className={`${density === 'compact' ? 'text-sm' : 'text-base'} max-w-3xl leading-relaxed text-text-2 text-pretty`}>
        {article.summary || article.content}
      </p>
    </SpotlightCard>
  );
}

export default function ArticleListIsland({ density = 'comfortable' }: { density?: 'comfortable' | 'compact' }) {
  const { data, isFetching, error, fetchNextPage, hasNextPage, filters } = useArticlesContext();
  // Merge, deduplicate by ID, and sort articles newest-to-oldest
  const articles = useMemo<Article[]>(() => {
    if (!Array.isArray(data?.pages)) return [];
    const merged = data.pages.reduce((acc: Article[], page: PageData) => {
      if (Array.isArray(page?.data)) {
        return acc.concat(page.data);
      }
      return acc;
    }, [] as Article[]);
    // Deduplicate by article id
    const seen = new Set<string>();
    const deduped: Article[] = [];
    for (const art of merged) {
      if (!seen.has(art.id)) {
        deduped.push(art);
        seen.add(art.id);
      }
    }
    // Sort newest-to-oldest
    return deduped.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }, [data?.pages]);

  const [visibleCount, setVisibleCount] = useState(20);
  const [pendingIncrease, setPendingIncrease] = useState(false);
  const [justLoadedIds, setJustLoadedIds] = useState<string[]>([]);
  const [newCount, setNewCount] = useState<number>(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevArticlesLength = useRef(0);
  const prevArticleIds = useRef<Set<string>>(new Set());
  const pollTimer = useRef<number | null>(null);
  // No node refs needed after removing react-transition-group

  // Reset view state when data pages change (filters applied or data refreshed)
  // This is a legitimate reset pattern - when query results change, reset pagination
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVisibleCount(20);
    prevArticleIds.current = new Set(articles.slice(0, 20).map((a: Article) => a.id));
  }, [data?.pages, articles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (pendingIncrease && articles.length > prevArticlesLength.current) {
      // Find truly new articles (not already visible)
      const currentVisibleIds = prevArticleIds.current;
      const newArticles = articles.filter((a: Article) => !currentVisibleIds.has(a.id));
      setJustLoadedIds(newArticles.map((a: Article) => a.id));
      setTimeout(() => setJustLoadedIds([]), 900);
      setVisibleCount(c => c + newArticles.length);
      // Update visible IDs
      prevArticleIds.current = new Set(articles.slice(0, visibleCount + newArticles.length).map((a: Article) => a.id));
      setPendingIncrease(false);
    }
    prevArticlesLength.current = articles.length;
  }, [articles, pendingIncrease, visibleCount]);

  // Only show the top N (visibleCount) articles, always from the newest
  const visibleArticles = articles.slice(0, visibleCount);
  const latestVisibleTs = visibleArticles.length > 0 ? new Date(visibleArticles[0].published_at).getTime() : 0;

  // Poll for newer items periodically and update newCount (must be before any early returns)
  // Optimized with Page Visibility API to pause when tab is hidden
  useEffect(() => {
    const checkForNew = async () => {
      // Skip polling if page is hidden to save resources
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const firstPage = await fetchArticlesPage(filters, 0);
        const page = Array.isArray(firstPage.data) ? firstPage.data : [];
        if (!page.length || !latestVisibleTs) { setNewCount(0); return; }
        const count = page.filter((a: Article) => new Date(a.published_at).getTime() > latestVisibleTs).length;
        setNewCount(count);
      } catch {
        // silent fail
      }
    };

    // Handle visibility change to pause/resume polling
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForNew(); // Check immediately when tab becomes visible
      }
    };

    // initial check and interval
    checkForNew();
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    // poll every 60s
    pollTimer.current = window.setInterval(checkForNew, 60_000) as unknown as number;

    // Listen for visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [filters, latestVisibleTs]);

  if (error) {
    return <div className="mt-8 border border-brand bg-bg-1 p-5 text-center font-mono text-sm uppercase tracking-[0.08em] text-brand-hover">Connection failed. Please try again.</div>;
  }
  if (!isFetching && visibleArticles.length === 0) {
    return <div className="mt-8 border border-white/20 bg-bg-1 p-8 text-center text-text-2">No articles match the active filters.</div>;
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



  // Removed external refreshSignal behavior per request

  return (
    <>
      {/* Refresh button removed per request */}
      <div className="cv-auto">
        {visibleArticles.map((article: Article, idx: number) => (
          <div
            key={article.id}
            className={justLoadedIds.includes(article.id) ? 'article-fade-in-enter-active' : ''}
            style={!justLoadedIds.includes(article.id) && idx < 20 ? {
              opacity: 0,
              animation: `fadeInUp 0.5s cubic-bezier(0.4, 0.2, 0.2, 1) ${Math.min(idx, 12) * 40}ms forwards`
            } : undefined}
          >
            <ArticleCard article={article} density={density} />
          </div>
        ))}
        {isFetching && visibleArticles.length === 0 ? skeletons : null}
      </div>
      {newCount > 0 && (
        <div className="fixed left-1/2 top-24 z-40 -translate-x-1/2 border border-brand bg-bg-1 px-4 py-2 shadow-md">
          <span className="micro-label text-white">{newCount} new {newCount === 1 ? 'story' : 'stories'} available</span>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <button
          ref={buttonRef}
          className={`signal-button transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:translate-y-0 disabled:hover:translate-y-0 ${pendingIncrease ? 'opacity-80' : ''}`}
          onClick={async () => {
            if (visibleCount + 20 > articles.length && hasNextPage) {
              setPendingIncrease(true);
              await fetchNextPage();
            } else {
              setVisibleCount(c => c + 20);
            }
          }}
          disabled={pendingIncrease || (!hasNextPage && visibleCount >= articles.length)}
        >
          {pendingIncrease ? (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle"></span>
          ) : null}
          {pendingIncrease ? 'Loading…' : (!hasNextPage && visibleCount >= articles.length) ? 'All caught up' : 'Load 20 more'}
        </button>
      </div>
      {visibleCount > 20 && (
        <button
          className="ghost-button fixed bottom-6 right-6 z-40 bg-bg-1"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          Top
        </button>
      )}
    </>
  );
}
