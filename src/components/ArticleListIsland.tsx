import React, { useState, useEffect, useRef } from "react";
import { useArticlesContext } from "../hooks/useArticlesContext.js";
import { CSSTransition, TransitionGroup } from 'react-transition-group';

function ArticleCard({ article }: { article: any }) {
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
  return (
    <div className="glassmorphic-article-card animated-gradient article-card-hoverable p-6 mb-8 transition-all">
      <div className="flex items-center gap-2 mb-2">
        {logoPath && (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400/90 via-fuchsia-300/20 to-indigo-700/60 ring-2 ring-cyan-200 shadow-[0_0_12px_2px_rgba(77,255,240,0.08)] mr-2 flex items-center justify-center">
            <img src={logoPath} alt={article.company + ' logo'} className="w-5 h-5 rounded-full" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} />
          </span>
        )}
        <span className="font-bold text-cyan text-sm">{article.company}</span>
        <span className="text-xs text-white/60 ml-2">{new Date(article.published_at).toLocaleDateString()}</span>
      </div>
      <h2 className="text-lg font-bold text-white mb-1">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan underline">
          {article.title}
        </a>
      </h2>
      <p className="text-sm text-white/80 mb-2">{article.summary || article.content}</p>
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span>Source: {article.source_type}</span>
      </div>
    </div>
  );
}

export default function ArticleListIsland() {
  const { data, isFetching, error, fetchNextPage, hasNextPage } = useArticlesContext();
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevArticlesLength = useRef(0);
  const prevArticleIds = useRef<Set<string>>(new Set());

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

  if (error) {
    return <div className="text-magenta-200 text-center mt-8">Error loading articles.</div>;
  }
  if (!isFetching && visibleArticles.length === 0) {
    return <div className="text-white/70 text-center mt-8">No articles found.</div>;
  }

  const handleLoadMore = async () => {
    if (visibleCount + 20 > articles.length && hasNextPage) {
      setPendingIncrease(true);
      await fetchNextPage();
    } else {
      setVisibleCount(c => c + 20);
    }
  };

  return (
    <>
      <TransitionGroup component={null}>
        {visibleArticles.map((article: any) => (
          <CSSTransition
            key={article.id}
            timeout={900}
            classNames="article-fade-in"
            appear={false}
          >
            <div className={justLoadedIds.includes(article.id) ? 'article-fade-in-enter-active' : ''}>
              <ArticleCard article={article} />
            </div>
          </CSSTransition>
        ))}
      </TransitionGroup>
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
    </>
  );
}
