import { getEntity, intelligenceSources } from "./intelligenceCatalog.js";
import type { IntelligenceSource } from "./intelligenceCatalog.js";
import type { Article } from "../types/article.js";
import { isSafeArticleRouteId } from "./articleRoutes.js";
import { articleSourceIdentity } from "./articleSourceIdentity.mjs";
import deepMindSourceUrls from "../data/deepmind-source-urls.json";

const deepMindSourceById = new Map(
  deepMindSourceUrls.map(({ id, from, to }) => [id, { from, to }]),
);

function currentPublisherUrl(article: Article): Article {
  const verified = deepMindSourceById.get(article.id);
  return article.source_key === "deepmind-blog" && verified?.from === article.url
    ? { ...article, url: verified.to }
    : article;
}

const sourceByKey = new Map(
  intelligenceSources.map((source) => [source.sourceKey, source]),
);

function exactHttpsUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || (url.port !== "" && url.port !== "443")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function sourceForArticle(article: Article): IntelligenceSource | undefined {
  const endpoint = exactHttpsUrl(article.source_url)?.toString();
  if (!endpoint) return undefined;

  const source = article.source_key
    ? sourceByKey.get(article.source_key)
    : intelligenceSources.find((candidate) => (
      exactHttpsUrl(candidate.endpointUrl)?.toString() === endpoint
    ));
  if (!source || exactHttpsUrl(source.endpointUrl)?.toString() !== endpoint) return undefined;

  const entity = getEntity(source.entitySlug);
  return entity?.name === article.company ? source : undefined;
}

function admittedCanonicalUrl(source: IntelligenceSource, value: string): boolean {
  const url = exactHttpsUrl(value);
  if (!url) return false;

  const hosts = new Set(source.allowedHosts.map((host) => host.toLowerCase()));
  for (const sourceUrl of [source.officialUrl, source.endpointUrl]) {
    const parsed = exactHttpsUrl(sourceUrl);
    if (parsed) hosts.add(parsed.hostname.toLowerCase());
  }
  return hosts.has(url.hostname.toLowerCase());
}

export function isArticleAdmitted(article: Article): boolean {
  if (!isSafeArticleRouteId(article.id)) return false;
  const current = currentPublisherUrl(article);
  const source = sourceForArticle(current);
  return source !== undefined && admittedCanonicalUrl(source, current.url);
}

export function sourceKeyForArticle(article: Article): string | null {
  return sourceForArticle(article)?.sourceKey ?? null;
}

export function admittedRouteArticles(articles: Article[]): Article[] {
  return articles.map(currentPublisherUrl).filter(isArticleAdmitted);
}

function deepMindPreference(article: Article): number {
  const original = deepMindSourceById.get(article.id)?.from ?? article.url;
  const url = exactHttpsUrl(original);
  if (url?.hostname !== "deepmind.google") return 0;
  return url.pathname.startsWith("/blog/") ? 2 : 1;
}

export function admittedArticles(articles: Article[]): Article[] {
  const routes = admittedRouteArticles(articles);
  const preferred = new Map<string, Article>();
  for (const article of routes) {
    if (article.source_key !== "deepmind-blog") continue;
    const source = articleSourceIdentity(article.url);
    const previous = preferred.get(source);
    if (
      !previous
      || deepMindPreference(article) > deepMindPreference(previous)
      || (deepMindPreference(article) === deepMindPreference(previous) && article.id < previous.id)
    ) {
      preferred.set(source, article);
    }
  }
  return routes.filter((article) =>
    article.source_key !== "deepmind-blog"
    || preferred.get(articleSourceIdentity(article.url))?.id === article.id,
  );
}
