import { allArticles } from "./feeds.js";
import { majorUpdates } from "./majorUpdates.js";
import verifiedCorrections from "../data/publication-corrections.json";
import type { Article } from "../types/article.js";

export interface DailyDigest {
  day: string;
  label: string;
  count: number;
  entities: number;
  majorCount: number;
  stories: Article[];
  /**
   * Records that used to be listed on this date and were re-dated after their publication
   * date was verified against the publisher's page. Only set when the date would otherwise
   * be empty, so the published daily URL stays valid and says where its records went.
   */
  redated?: Article[];
}

export interface DateCorrection {
  sourceKey: string;
  url: string;
  recorded: string;
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

export function dailyDigests(
  articles: Article[] = allArticles(),
  corrections: DateCorrection[] = verifiedCorrections,
): DailyDigest[] {
  const byDay = new Map<string, Article[]>();
  for (const article of articles) {
    const day = dayKeyOf(article.published_at);
    if (!day) continue;
    const items = byDay.get(day) ?? [];
    items.push(article);
    byDay.set(day, items);
  }
  // A date that only ever held wrongly dated records would vanish once they are corrected.
  const articleBySource = new Map(articles.map((article) => [`${article.source_key}\n${article.url}`, article]));
  const vacated = new Map<string, Article[]>();
  for (const correction of corrections) {
    const day = dayKeyOf(correction.recorded);
    const article = articleBySource.get(`${correction.sourceKey}\n${correction.url}`);
    if (!day || !article || byDay.has(day) || dayKeyOf(article.published_at) === day) continue;
    vacated.set(day, [...(vacated.get(day) ?? []), article]);
  }
  const vacatedDigests: DailyDigest[] = [...vacated.entries()].map(([day, redated]) => ({
    day,
    label: dayLabel(day),
    count: 0,
    entities: 0,
    majorCount: 0,
    stories: [],
    redated: redated.slice().sort((a, b) => b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id)),
  }));

  const dated = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, stories]) => {
      const ordered = stories.slice().sort((a, b) => (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        || b.id.localeCompare(a.id)
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
  return [...dated, ...vacatedDigests].sort((a, b) => b.day.localeCompare(a.day));
}
