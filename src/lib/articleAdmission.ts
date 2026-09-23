import { getEntity, intelligenceSources } from "./intelligenceCatalog.js";
import type { IntelligenceSource } from "./intelligenceCatalog.js";
import type { Article } from "../types/article.js";
import { isSafeArticleRouteId } from "./articleRoutes.js";
import { articleSourceIdentity } from "./articleSourceIdentity.mjs";
import { decodePublisherPunctuation } from "./publisherText.js";
import deepMindSourceUrls from "../data/deepmind-source-urls.json";
import duplicateSourceUrls from "../data/duplicate-source-urls.json";

const verifiedSourceById = new Map(
  [
    ...deepMindSourceUrls.map(({ id, from, to }) => ({ id, from, to, sourceKey: "deepmind-blog" })),
    ...duplicateSourceUrls,
  ].map(({ id, from, to, sourceKey }) => [id, { from, to, sourceKey }]),
);
const duplicateSourceIds = new Set(duplicateSourceUrls.map(({ id }) => id));

function currentPublisherUrl(article: Article): Article {
  const verified = verifiedSourceById.get(article.id);
  return verified && article.source_key === verified.sourceKey && verified.from === article.url
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
  return articles.map(currentPublisherUrl).filter(isArticleAdmitted).map((article) => ({
    ...article,
    title: decodePublisherPunctuation(article.title),
    ...(article.summary ? { summary: decodePublisherPunctuation(article.summary) } : {}),
    ...(article.content ? { content: decodePublisherPunctuation(article.content) } : {}),
  }));
}

function sourcePreference(article: Article): number {
  const original = verifiedSourceById.get(article.id)?.from ?? article.url;
  if (articleSourceIdentity(original) === articleSourceIdentity(article.url)) return 3;
  const url = exactHttpsUrl(original);
  if (article.source_key !== "deepmind-blog" || url?.hostname !== "deepmind.google") return 0;
  return url.pathname.startsWith("/blog/") ? 2 : 1;
}

function dedupKey(article: Article): string | null {
  if (article.source_key !== "deepmind-blog" && !duplicateSourceIds.has(article.id)) return null;
  return `${article.source_key}:${articleSourceIdentity(article.url)}`;
}

export function admittedArticles(articles: Article[]): Article[] {
  const routes = admittedRouteArticles(articles);
  const preferred = new Map<string, Article>();
  for (const article of routes) {
    const source = dedupKey(article);
    if (!source) continue;
    const previous = preferred.get(source);
    if (
      !previous
      || sourcePreference(article) > sourcePreference(previous)
      || (sourcePreference(article) === sourcePreference(previous) && article.id < previous.id)
    ) {
      preferred.set(source, article);
    }
  }
  return routes.filter((article) => {
    const source = dedupKey(article);
    return !source || preferred.get(source)?.id === article.id;
  });
}
