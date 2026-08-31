import { allArticles } from "./feeds.js";
import { majorUpdates } from "./majorUpdates.js";
import type { Article } from "../types/article.js";

export interface DailyDigest {
  day: string;
  label: string;
  count: number;
  entities: number;
  majorCount: number;
  stories: Article[];
}

export function dayKeyOf(dateIso: string): string {
  const date = new Date(dateIso);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function dailyDigests(articles: Article[] = allArticles()): DailyDigest[] {
  const byDay = new Map<string, Article[]>();
  for (const article of articles) {
    const day = dayKeyOf(article.published_at);
    if (!day) continue;
    const items = byDay.get(day) ?? [];
    items.push(article);
    byDay.set(day, items);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, stories]) => {
      const ordered = stories.slice().sort((a, b) => (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      ));
      return {
        day,
        label: dayLabel(day),
        count: ordered.length,
        entities: new Set(ordered.map((article) => article.company)).size,
        majorCount: majorUpdates(ordered).length,
        stories: ordered,
      };
    });
}
