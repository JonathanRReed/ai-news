import { isSafeArticleRouteId } from './articleRoutes.js';
export type WatchlistStory = { id: string; company: string; title: string; published_at: string };
export function isWatchlistStory(value: unknown): value is WatchlistStory {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && isSafeArticleRouteId(row.id)
    && typeof row.company === 'string' && row.company.length > 0
    && typeof row.title === 'string' && row.title.length > 0
    && typeof row.published_at === 'string' && Number.isFinite(Date.parse(row.published_at));
}
