import { allArticles } from "./feeds.js";
import { importanceScore } from "./articleTags.js";
import type { Article } from "../types/article.js";

// ISO-ish week key = the Monday (UTC) of the week the article was published.
export function weekKeyOf(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  const dayFromMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayFromMonday));
  return monday.toISOString().slice(0, 10);
}

export function weekLabel(weekKey: string): string {
  const d = new Date(`${weekKey}T00:00:00Z`);
  return `Week of ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d)}`;
}

export interface DigestWeek {
  week: string;
  label: string;
  count: number;
  labs: number;
  topStories: Article[];
}

export function digestWeeks(maxWeeks = 8, minArticles = 5): DigestWeek[] {
  const byWeek = new Map<string, Article[]>();
  for (const article of allArticles()) {
    const key = weekKeyOf(article.published_at);
    if (!key) continue;
    const list = byWeek.get(key) ?? [];
    list.push(article);
    byWeek.set(key, list);
  }
  return [...byWeek.entries()]
    .filter(([, items]) => items.length >= minArticles)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxWeeks)
    .map(([week, items]) => {
      // Score recency relative to the end of that week so within-week recency is meaningful.
      const weekEnd = new Date(`${week}T00:00:00Z`).getTime() + 6 * 86400000;
      const ranked = [...items].sort((a, b) => importanceScore(b, weekEnd) - importanceScore(a, weekEnd));
      return {
        week,
        label: weekLabel(week),
        count: items.length,
        labs: new Set(items.map((i) => i.company)).size,
        topStories: ranked.slice(0, 8),
      };
    });
}
