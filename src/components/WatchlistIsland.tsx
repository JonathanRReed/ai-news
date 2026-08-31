import React, { useEffect, useMemo, useState } from "react";
import EntityWatchButton, { WATCHLIST_EVENT, WATCHLIST_KEY } from "./EntityWatchButton.js";
import type { IntelligenceEntity } from "../lib/intelligenceCatalog.js";
import type { Article } from "../types/article.js";

function watchedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export default function WatchlistIsland({ entities, articles }: { entities: IntelligenceEntity[]; articles: Article[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);
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
  const names = useMemo(() => new Set(selected.map((entity) => entity.name)), [selected]);
  const stories = useMemo(() => articles.filter((article) => names.has(article.company)).slice(0, 80), [articles, names]);

  if (!selected.length) {
    return (
      <div className="industrial-border p-8">
        <p className="text-lg text-white">Your watchlist is empty.</p>
        <p className="mt-2 max-w-2xl text-text-2">Open any lab or harness intelligence page and choose Watch. It stays in this browser. No account or server profile is created.</p>
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
          <span className="micro-label text-text-2">{stories.length} cached</span>
        </div>
        {stories.length ? (
          <ol>
            {stories.map((article) => (
              <li key={article.id} className="border-b border-white/15 py-4">
                <p className="micro-label mb-2 text-text-2">{article.company} · {new Date(article.published_at).toLocaleDateString()}</p>
                <a href={`/article/${article.id}/`} className="text-lg font-bold text-white underline decoration-brand decoration-2 underline-offset-4 hover:text-brand-hover focus-industrial">{article.title}</a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="industrial-border p-6 text-text-2">No cached stories have arrived for these entities yet. Their source status remains visible on each intelligence page.</p>
        )}
      </section>
    </div>
  );
}
