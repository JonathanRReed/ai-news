/* global AbortController */
import React, { useEffect, useMemo, useState } from "react";
import EntityWatchButton, { WATCHLIST_EVENT, WATCHLIST_KEY } from "./EntityWatchButton.js";
import type { IntelligenceEntity } from "../lib/intelligenceCatalog.js";
import { articlePath } from "../lib/articleRoutes.js";
import type { Article } from "../types/article.js";

type WatchlistStory = Pick<Article, "id" | "company" | "title" | "published_at">;

function watchedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export default function WatchlistIsland({ entities }: { entities: IntelligenceEntity[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [articles, setArticles] = useState<WatchlistStory[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const update = () => setSlugs(watchedSlugs());
    update();
    window.addEventListener(WATCHLIST_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const selected = useMemo(() => entities.filter((entity) => slugs.includes(entity.slug)), [entities, slugs]);
  useEffect(() => {
    if (!selected.length || articles !== null || loadError) return;
    const controller = new AbortController();
    fetch("/data/watchlist.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Watchlist data returned ${response.status}`);
        return response.json() as Promise<{ articles: WatchlistStory[] }>;
      })
      .then((data) => {
        if (!Array.isArray(data.articles)) throw new Error("Watchlist data is invalid");
        setArticles(data.articles);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(true);
      });
    return () => controller.abort();
  }, [selected.length, articles, loadError]);
  const names = useMemo(() => new Set(selected.map((entity) => entity.name)), [selected]);
  const stories = useMemo(() => (articles ?? []).filter((article) => names.has(article.company)).slice(0, 80), [articles, names]);

  if (!selected.length) {
    return (
      <div className="industrial-border p-8">
        <p className="text-lg text-white">Your watchlist is empty.</p>
        <p className="mt-2 max-w-2xl text-text-2">Open any lab, provider, or agent-tool page and choose Watch. Your selections stay in this browser. No account or server profile is created.</p>
        <a href="/labs/" className="signal-button mt-6">Browse labs</a>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="micro-label mb-4 text-text-2">Watching {selected.length}</p>
        <div className="flex flex-wrap gap-3">
          {selected.map((entity) => <EntityWatchButton key={entity.slug} slug={entity.slug} name={entity.name} />)}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-white/15 pb-3">
          <h2 className="text-2xl font-bold text-white">Latest watched updates</h2>
          <span className="micro-label text-text-2">{stories.length} updates</span>
        </div>
        {loadError ? (
          <p className="industrial-border p-6 text-text-2">Could not load updates. Reload the page to try again.</p>
        ) : articles === null ? (
          <p className="industrial-border p-6 text-text-2">Loading watched updates...</p>
        ) : stories.length ? (
          <ol>
            {stories.map((article) => (
              <li key={article.id} className="border-b border-white/15 py-4">
                <p className="micro-label mb-2 text-text-2">{article.company} · {new Date(article.published_at).toLocaleDateString()}</p>
                <a href={articlePath(article.id)} className="text-lg font-bold text-white underline decoration-brand decoration-2 underline-offset-4 hover:text-brand-hover focus-industrial break-words">{article.title}</a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="industrial-border p-6 text-text-2">No stories are available for these sources yet. Open a source page to see its current status.</p>
        )}
      </section>
    </div>
  );
}
