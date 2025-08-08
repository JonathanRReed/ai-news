import React, { useState, useEffect, useRef } from "react";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { fetchArticlesPage } from "../hooks/fetchArticlesPage.js";

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ArticleCard({ article, density = 'comfortable' }: { article: any, density?: 'comfortable'|'compact' }) {
  // Explicit logo mapping for every provider
  const logoMap: Record<string, string> = {
    'OpenAI': '/logos/OpenAI_logo.svg',
    'Meta AI': '/logos/Meta_logo.svg',
    'Anthropic': '/logos/Anthropic_logo.svg',
    'Google DeepMind': '/logos/DeepMind_logo.svg',
    'Mistral AI': '/logos/Mistral_logo.svg',
    'Hugging Face': '/logos/Hugging_Face_logo.svg',
    'xAI': '/logos/Xai_logo.svg',
  };
  const logoPath = logoMap[article.company];
  const pad = density === 'compact' ? 'p-4' : 'p-6';
  const gap = density === 'compact' ? 'gap-1' : 'gap-2';
  const title = density === 'compact' ? 'text-base' : 'text-lg';
  const meta = density === 'compact' ? 'text-xs' : 'text-sm';
  return (
    <div className={`glassmorphic-article-card animated-gradient article-card-hoverable ${pad} mb-6 transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        {logoPath && (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mr-2 flex items-center justify-center">
            <img src={logoPath} alt={article.company + ' logo'} className="w-5 h-5 rounded-full" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} />
          </span>
        )}
        <span className="font-bold text-cyan text-sm">{article.company}</span>
        <span className="text-xs text-white/60 ml-2">{new Date(article.published_at).toLocaleDateString()}</span>
      </div>
      <h2 className={`${title} font-bold text-white mb-1`}>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan underline">
          {article.title}
        </a>
      </h2>
      <div className={`flex items-center ${gap} ${meta} text-white/60 mb-2`}>
        {getDomain(article.url) && (
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">{getDomain(article.url)}</span>
        )}
        {article.source_type ? <span>• {article.source_type}</span> : null}
      </div>
      <p className={`${meta} text-white/80`}>{article.summary || article.content}</p>
    </div>
  );
}

export default function ArticleListIsland({ density = 'comfortable' }: { density?: 'comfortable'|'compact' }) {
  const { data, isFetching, error, fetchNextPage, hasNextPage, refetch, filters } = useArticlesContext();
  // Merge, deduplicate by ID, and sort articles newest-to-oldest
  const articles = Array.isArray(data?.pages)
    ? (() => {
        const merged = data.pages.reduce((acc: any[], page: any) => {
          if (Array.isArray(page?.data)) {
            return [...acc, ...page.data];
          }
          return acc;
        }, []);
        // Deduplicate by article id
        const seen = new Set();
        const deduped = [];
        for (const art of merged) {
          if (!seen.has(art.id)) {
            deduped.push(art);
            seen.add(art.id);
          }
        }
        // Sort newest-to-oldest
        return deduped.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      })()
    : [];

  const [visibleCount, setVisibleCount] = useState(20);
  const [pendingIncrease, setPendingIncrease] = useState(false);
  const [justLoadedIds, setJustLoadedIds] = useState<string[]>([]);
  const [newCount, setNewCount] = useState<number>(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevArticlesLength = useRef(0);
  const prevArticleIds = useRef<Set<string>>(new Set());
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    setVisibleCount(20);
    prevArticleIds.current = new Set(articles.slice(0, 20).map((a: any) => a.id));
  }, [data?.pages]);

  useEffect(() => {
    if (pendingIncrease && articles.length > prevArticlesLength.current) {
      // Find truly new articles (not already visible)
      const currentVisibleIds = prevArticleIds.current;
      const newArticles = articles.filter((a: any) => !currentVisibleIds.has(a.id));
      setJustLoadedIds(newArticles.map((a: any) => a.id));
      setTimeout(() => setJustLoadedIds([]), 900);
      setVisibleCount(c => c + newArticles.length);
      // Update visible IDs
      prevArticleIds.current = new Set(articles.slice(0, visibleCount + newArticles.length).map((a: any) => a.id));
      setPendingIncrease(false);
    }
    prevArticlesLength.current = articles.length;
  }, [articles.length, pendingIncrease]);

  // Only show the top N (visibleCount) articles, always from the newest
  const visibleArticles = articles.slice(0, visibleCount);
  const latestVisibleTs = visibleArticles.length > 0 ? new Date(visibleArticles[0].published_at).getTime() : 0;

  if (error) {
    return <div className="text-magenta-200 text-center mt-8">Error loading articles.</div>;
  }
  if (!isFetching && visibleArticles.length === 0) {
    return <div className="text-white/70 text-center mt-8">No articles found.</div>;
  }

  // Skeletons for initial load
  const skeletons = (
    <>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glassmorphic-article-card mb-6 p-6 animate-pulse bg-white/5 rounded-xl">
          <div className="h-4 w-40 bg-white/10 rounded mb-3"></div>
          <div className="h-6 w-3/4 bg-white/10 rounded mb-2"></div>
          <div className="h-4 w-2/3 bg-white/10 rounded"></div>
        </div>
      ))}
    </>
  );

  const handleLoadMore = async () => {
    if (visibleCount + 20 > articles.length && hasNextPage) {
      setPendingIncrease(true);
      await fetchNextPage();
    } else {
      setVisibleCount(c => c + 20);
    }
  };

  // Poll for newer items periodically and update newCount
  useEffect(() => {
    const checkForNew = async () => {
      try {
        const firstPage = await fetchArticlesPage(filters, 0);
        const page = Array.isArray(firstPage.data) ? firstPage.data : [];
        if (!page.length || !latestVisibleTs) { setNewCount(0); return; }
        const count = page.filter((a: any) => new Date(a.published_at).getTime() > latestVisibleTs).length;
        setNewCount(count);
      } catch (e) {
        // silent fail
      }
    };
    // initial check and interval
    checkForNew();
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    // poll every 60s
    pollTimer.current = window.setInterval(checkForNew, 60_000) as unknown as number;
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [filters, latestVisibleTs]);

  // Removed external refreshSignal behavior per request

  return (
    <>
      {/* Refresh button removed per request */}
      <TransitionGroup component={null}>
        {visibleArticles.map((article: any) => (
          <CSSTransition
            key={article.id}
            timeout={900}
            classNames="article-fade-in"
            appear={false}
          >
            <div className={justLoadedIds.includes(article.id) ? 'article-fade-in-enter-active' : ''}>
              <ArticleCard article={article} density={density} />
            </div>
          </CSSTransition>
        ))}
      </TransitionGroup>
      {isFetching && visibleArticles.length === 0 ? skeletons : null}
      {newCount > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 glassmorphic-article-card px-4 py-2 rounded-full border border-cyan/30 bg-white/10 backdrop-blur-md shadow-md">
          <span className="text-sm text-white/90">{newCount} new {newCount === 1 ? 'story' : 'stories'} available</span>
        </div>
      )}
      <div className="flex justify-center mt-8">
        <button
          ref={buttonRef}
          className={`glassmorphic-article-card px-8 py-2 rounded-full font-semibold text-cyan border-2 border-cyan/40 shadow-lg backdrop-blur-md bg-white/10 hover:shadow-[0_0_16px_3px_rgba(77,255,240,0.22),0_0_20px_6px_rgba(255,0,200,0.13)] hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan/60 disabled:opacity-40 ${pendingIncrease ? 'animate-pulse' : ''}`}
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
          {pendingIncrease ? <span className="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin align-middle mr-2"></span> : null}
          Load 20 More
        </button>
      </div>
      {visibleCount > 20 && (
        <button
          className="fixed bottom-6 right-6 z-40 rounded-full bg-white/15 text-white border border-white/20 px-4 py-2 shadow-lg backdrop-blur-md hover:bg-white/25 transition"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}
    </>
  );
}
