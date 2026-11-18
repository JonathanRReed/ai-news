import type { Article } from "../types/article.js";

// Deterministic record kinds for the feed. Nothing here ranks or hides a record:
// it only decides how much room a row gets and which rows fold into a build group.
export type RecordKind = "story" | "release" | "build";

type KindInput = Pick<Article, "title" | "url" | "source_key" | "item_type">;

const RELEASE_SOURCE_KEY = /-releases$/;
const GITHUB_RELEASE_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/tag\//i;
const RELEASE_ITEM_TYPES = new Set(["release", "harness_release"]);

// A pre-release marker has to stand as its own tag segment (0.157.0-alpha.11,
// v0.1.5rc3, v0.86.3.dev, nv_dev_f8e8fb5), never as part of a longer word.
const PRERELEASE_MARKER = /(?:^|[\d._-])(?:alpha|beta|rc|nightly|preview|canary|dev|snapshot)(?=$|[\d._-])/i;
// Automation tags: publish jobs keyed by commit, and per-package path tags that
// repeat one release for every workspace package (sdk/core/v0.0.85).
const AUTOMATION_TAG = /^release-publish\//i;
const PACKAGE_PATH_TAG = /^[a-z0-9_-]+\/[a-z0-9_/-]*v?\d/i;

function tagOf(title: string): string {
  // "kosong-0.55.0: chore(release): bump ..." carries the tag before the colon.
  return (title.split(": ")[0] ?? title).trim();
}

export function isReleaseRecord(article: KindInput): boolean {
  if (article.item_type && RELEASE_ITEM_TYPES.has(article.item_type)) return true;
  if (article.source_key && RELEASE_SOURCE_KEY.test(article.source_key)) return true;
  return GITHUB_RELEASE_URL.test(article.url || "");
}

export function recordKind(article: KindInput): RecordKind {
  if (!isReleaseRecord(article)) return "story";
  const tag = tagOf(article.title || "");
  if (AUTOMATION_TAG.test(tag) || PACKAGE_PATH_TAG.test(tag) || PRERELEASE_MARKER.test(tag)) return "build";
  return "release";
}

// A "build" row is either a pre-release (alpha, rc, dev) or a per-package tag that repeats one
// release for each workspace package. Both fold, but only the first is a pre-release.
export type BuildFlavor = "prerelease" | "package";

export function buildFlavor(article: Pick<Article, "title">): BuildFlavor {
  const tag = tagOf(article.title || "");
  return PRERELEASE_MARKER.test(tag) || AUTOMATION_TAG.test(tag) ? "prerelease" : "package";
}

export function recordKindLabel(kind: RecordKind, article?: Pick<Article, "title">): string | null {
  if (kind === "release") return "Software release";
  if (kind === "build") return article && buildFlavor(article) === "package" ? "Package release" : "Pre-release build";
  return null;
}

/** "3 pre-release builds", "5 package releases", or "6 builds and package releases" for a mixed day. */
export function buildGroupLabel(articles: Array<Pick<Article, "title">>): string {
  const flavors = new Set(articles.map(buildFlavor));
  const noun = flavors.size > 1 ? "builds and package releases" : flavors.has("package") ? "package releases" : "pre-release builds";
  return `${articles.length} ${noun}`;
}

export function releaseTag(title: string): string {
  return tagOf(title);
}

// Release tags such as "0.156.1" name no project, so labels and link names add it.
export function recordDisplayTitle(article: Pick<Article, "title" | "company" | "url" | "source_key" | "item_type">): string {
  return recordKind(article) !== "story" && titleNeedsProject(article) ? `${article.company} ${article.title}` : article.title;
}

// Release tags such as "0.156.1" name no project. The publisher's title stays
// untouched; this only says whether the row should print the project beside it.
export function titleNeedsProject(article: Pick<Article, "title" | "company">): boolean {
  const company = (article.company || "").trim().toLowerCase();
  if (!company) return false;
  return !(article.title || "").toLowerCase().includes(company);
}
