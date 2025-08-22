import React, { useState, useEffect, useRef, useMemo } from "react";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { fetchArticlesPage } from "../hooks/fetchArticlesPage.js";
import type { Article, PageData } from "../types/article.js";

function resolveLogo(company: string): string | undefined {
  const name = (company || "").toLowerCase();
  if (name.includes("openai")) return "/logos/OpenAI_logo.svg";
  if (name.includes("meta")) return "/logos/Meta_logo.svg";
  if (name.includes("deepmind")) return "/logos/DeepMind_logo.svg";
  if (name.includes("anthropic")) return "/logos/Anthropic_logo.svg";
  if (name.includes("mistral")) return "/logos/Mistral_logo.svg";
  if (name.includes("hugging")) return "/logos/Hugging_Face_logo.svg";
  if (name.includes("x.ai") || name.includes("xai")) return "/logos/Xai_logo.svg";
  return "/logos/Globe Icon.svg";
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Article type imported from ../types/article

function ArticleCard({ article, density = 'comfortable' }: { article: Article, density?: 'comfortable'|'compact' }) {
  // Resolve logo from local /public/logos even if the company string varies slightly
  const logoPath = resolveLogo(article.company);
  const pad = density === 'compact' ? 'p-4' : 'p-6';
  const gap = density === 'compact' ? 'gap-1' : 'gap-2';
  const title = density === 'compact' ? 'text-base' : 'text-lg';
  const meta = density === 'compact' ? 'text-xs' : 'text-sm';
  return (
    <div className={`glassmorphic-article-card animated-gradient article-card-hoverable ${pad} mb-6 transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        {logoPath && (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mr-2 flex items-center justify-center">
            <img src={logoPath} alt={article.company + ' logo'} className="w-5 h-5 rounded-full" loading="lazy" />
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

  useEffect(() => {
    setVisibleCount(20);
    prevArticleIds.current = new Set(articles.slice(0, 20).map((a: Article) => a.id));
  }, [data?.pages, articles]);

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
  useEffect(() => {
    const checkForNew = async () => {
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
    // initial check and interval
    checkForNew();
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    // poll every 60s
    pollTimer.current = window.setInterval(checkForNew, 60_000) as unknown as number;
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [filters, latestVisibleTs]);

  if (error) {
    return <div className="text-magenta-200 text-center mt-8">Error loading articles.</div>;
  }
  if (!isFetching && visibleArticles.length === 0) {
    return <div className="text-white/70 text-center mt-8">No articles found.</div>;
  }

  // Skeletons for initial load
  const skeletons = (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glassmorphic-article-card mb-6 p-6 animate-pulse bg-white/5 rounded-xl">
          <div className="h-4 w-40 bg-white/10 rounded mb-3"></div>
          <div className="h-6 w-3/4 bg-white/10 rounded mb-2"></div>
          <div className="h-4 w-2/3 bg-white/10 rounded"></div>
        </div>
      ))}
    </>
  );

  

  // Removed external refreshSignal behavior per request

  return (
    <>
      {/* Refresh button removed per request */}
      <div className="cv-auto">
        {visibleArticles.map((article: Article) => (
          <div key={article.id} className={justLoadedIds.includes(article.id) ? 'article-fade-in-enter-active' : ''}>
            <ArticleCard article={article} density={density} />
          </div>
        ))}
        {isFetching && visibleArticles.length === 0 ? skeletons : null}
      </div>
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
