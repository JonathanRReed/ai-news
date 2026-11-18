import { articleExcerpt } from "./articleExcerpt.js";
import { recordKind } from "./releaseKind.js";
import type { Article } from "../types/article.js";

export interface StoryFeedRow {
  type: "article";
  article: Article;
}

// Pre-release and automated builds from one project on one UTC day. Every member
// stays reachable from the row; the group only stops them from burying other news.
export interface BuildGroupFeedRow {
  type: "builds";
  key: string;
  company: string;
  articles: Article[];
}

export type FeedRow = StoryFeedRow | BuildGroupFeedRow;

export interface FeedDay {
  day: string;
  rows: FeedRow[];
  count: number;
}

export const UNDATED_DAY = "undated";

/**
 * The excerpt a row prints, or "" for none. A pre-release build keeps its row but not its
 * changelog fragment, and release notes that only repeat the tag ("Release 0.157.0-alpha.11")
 * add nothing.
 */
export function rowExcerpt(article: Article): string {
  if (recordKind(article) === "build") return "";
  const excerpt = articleExcerpt(article);
  const repeatsTitle = excerpt.length <= article.title.length + 12
    && excerpt.toLowerCase().includes(article.title.toLowerCase());
  return repeatsTitle ? "" : excerpt;
}

export function utcDayKey(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? UNDATED_DAY : date.toISOString().slice(0, 10);
}

// Expects articles already in feed order (newest first). A group sits where its
// newest build would have sat, so the ledger still reads top to bottom by time.
export function groupFeedRows(articles: Article[], options: { foldBuilds?: boolean } = {}): FeedRow[] {
  if (options.foldBuilds === false) return articles.map((article) => ({ type: "article", article }));
  const rows: FeedRow[] = [];
  const groups = new Map<string, BuildGroupFeedRow>();
  for (const article of articles) {
    if (recordKind(article) !== "build") {
      rows.push({ type: "article", article });
      continue;
    }
    const key = `${utcDayKey(article.published_at)}|${article.company}`;
    const existing = groups.get(key);
    if (existing) {
      existing.articles.push(article);
      continue;
    }
    const group: BuildGroupFeedRow = { type: "builds", key, company: article.company, articles: [article] };
    groups.set(key, group);
    rows.push(group);
  }
  // One build on its own is just a row; a group needs at least two members.
  return rows.map((row) => (
    row.type === "builds" && row.articles.length === 1
      ? { type: "article", article: row.articles[0] }
      : row
  ));
}

export function groupFeedDays(articles: Article[], options: { foldBuilds?: boolean } = {}): FeedDay[] {
  const byDay = new Map<string, Article[]>();
  for (const article of articles) {
    const day = utcDayKey(article.published_at);
    const list = byDay.get(day) ?? [];
    list.push(article);
    byDay.set(day, list);
  }
  return [...byDay.entries()].map(([day, items]) => ({
    day,
    rows: groupFeedRows(items, options),
    count: items.length,
  }));
}

const DAY_MS = 86_400_000;

// "Today" and "Yesterday" follow the UTC calendar, the same one the daily archive uses,
// so a day header always matches its /digest/daily/ page.
export function feedDayLabel(day: string, nowMs: number): string {
  if (day === UNDATED_DAY) return "Undated";
  const start = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(start)) return "Undated";
  const now = new Date(nowMs);
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dated = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: new Date(start).getUTCFullYear() === now.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(start));
  if (start === todayStart) return `Today, ${dated}`;
  if (start === todayStart - DAY_MS) return `Yesterday, ${dated}`;
  return dated;
}

// Many publishers give a date without a time, stored as midnight UTC. Printing "00:00" would
// present that as a real publication time, so those records show no clock time at all.
export function isDateOnly(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() % 86_400_000 === 0;
}

export function utcClockTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || isDateOnly(value)) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}
