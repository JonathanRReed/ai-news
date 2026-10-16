import { URL } from 'node:url';
import { feedParserInternals } from './parse-feed.mjs';
import { admittedHttpsUrl } from './source-policy.mjs';
import { isSourceBoilerplate } from '../../src/lib/sourceBoilerplate.mjs';

const { blocks, decodeXml, stripMarkup, tagValue } = feedParserInternals;

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(stripMarkup(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function webUrl(source, value) {
  try {
    return admittedHttpsUrl(source, decodeXml(value).trim());
  } catch {
    return null;
  }
}

function includedPath(source, pathname) {
  return !source.includePaths?.length || source.includePaths.some((prefix) => pathname.startsWith(prefix));
}

export function parseSitemap(source, xml) {
  const sitemapEntries = blocks(xml, 'sitemap').map((entry) => ({
    url: webUrl(source, tagValue(entry, 'loc')),
    lastModified: normalizeDate(tagValue(entry, 'lastmod')),
    isSitemap: true,
  }));
  const pageEntries = blocks(xml, 'url').map((entry) => ({
    url: webUrl(source, tagValue(entry, 'loc')),
    lastModified: normalizeDate(tagValue(entry, 'lastmod')),
    isSitemap: false,
  }));

  return [...sitemapEntries, ...pageEntries]
    .filter((entry) => entry.url)
    .filter((entry) => entry.isSitemap || includedPath(source, entry.url.pathname))
    .map((entry) => ({ ...entry, url: entry.url.toString() }))
    .sort((left, right) => {
      const dateOrder = Date.parse(right.lastModified ?? '') - Date.parse(left.lastModified ?? '');
      return (Number.isNaN(dateOrder) ? 0 : dateOrder) || left.url.localeCompare(right.url);
    });
}

const TITLE_SUFFIXES = new Map([
  ['xai-news-sitemap', [' | SpaceXSI', ' | xAI']],
  ['deepseek-api-news', [' | DeepSeek API Docs']],
]);
const CHANGELOG_SUMMARY_LENGTH = 280;
// Sitemap lastmod tracks edits, not publication. These sources must date from the page or be skipped.
const PAGE_DATED_SOURCES = new Set(['xai-news-sitemap', 'deepseek-api-news']);

function utcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString()
    : null;
}

function titleWithoutSuffix(source, title) {
  const suffix = (TITLE_SUFFIXES.get(source.sourceKey) ?? []).find((value) => title.endsWith(value));
  return suffix ? title.slice(0, -suffix.length).trim() : title;
}

// DeepSeek API docs label the current news page in the sidebar ("... 2026/09/10").
// Old slugs such as news0725 carry no year, so only six-digit slugs are a fallback.
function deepseekNewsDate(html, canonical) {
  const { pathname } = new URL(canonical);
  for (const [, tag, text] of html.matchAll(/(<a\b[^>]*>)([^<]*)<\/a>/gi)) {
    if (attribute(tag, 'aria-current') !== 'page' || attribute(tag, 'href') !== pathname) continue;
    const label = stripMarkup(text).match(/(\d{4})\/(\d{2})\/(\d{2})$/);
    if (label) return utcDate(Number(label[1]), Number(label[2]), Number(label[3]));
  }
  return deepseekSlugDate(pathname);
}

function deepseekSlugDate(pathname) {
  const slug = pathname.match(/\/news(\d{2})(\d{2})(\d{2})\/?$/);
  return slug ? utcDate(2000 + Number(slug[1]), Number(slug[2]), Number(slug[3])) : null;
}

// Orders sitemap pages for the fetch cap only. Publication dates still come from each page.
export function discoveryDate(source, entry) {
  if (entry.lastModified) return entry.lastModified;
  return source.sourceKey === 'deepseek-api-news' ? deepseekSlugDate(new URL(entry.url).pathname) : null;
}

function sourcePageDate(source, html, canonical) {
  return source.sourceKey === 'deepseek-api-news' ? deepseekNewsDate(html, canonical) : null;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function metaContent(html, key) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const matching = tags.find((tag) => {
    return attribute(tag, 'property') === key || attribute(tag, 'name') === key;
  });
  return matching ? attribute(matching, 'content') : '';
}

function canonicalLink(html) {
  const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const canonical = tags.find((tag) => attribute(tag, 'rel').toLowerCase() === 'canonical');
  return canonical ? attribute(canonical, 'href') : '';
}

function structuredPublicationDate(source, html, canonical) {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attribute(match[1], 'type').toLowerCase() !== 'application/ld+json') continue;
    let data;
    try { data = JSON.parse(match[2]); } catch { continue; }
    const queue = Array.isArray(data) ? [...data] : [data];
    for (let i = 0; i < queue.length && i < 1000; i++) {
      const item = queue[i];
      if (!item || typeof item !== 'object') continue;
      if (Array.isArray(item['@graph'])) queue.push(...item['@graph']);
      const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      if (!types.some(type => ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle'].includes(type))) continue;
      const identity = item.mainEntityOfPage?.['@id'] ?? item.mainEntityOfPage ?? item.url;
      if (identity) {
        if (typeof identity !== 'string') continue;
        let articleUrl;
        try { articleUrl = admittedHttpsUrl(source, decodeXml(identity).trim(), canonical); }
        catch { continue; }
        const pageUrl = new URL(canonical);
        // JSON-LD often identifies the article or webpage node with a fragment.
        articleUrl.hash = '';
        pageUrl.hash = '';
        if (articleUrl.toString() !== pageUrl.toString()) continue;
      }
      const date = typeof item.datePublished === 'string' ? normalizeDate(item.datePublished) : null;
      if (date) return date;
    }
  }
  return null;
}

export function parsePageMetadata(source, html, requestUrl, options = {}) {
  const rawCanonical = canonicalLink(html);
  const canonical = rawCanonical ? webUrl(source, rawCanonical) : webUrl(source, requestUrl);
  if (!canonical) return null;

  const title = titleWithoutSuffix(
    source,
    stripMarkup(metaContent(html, 'og:title') || tagValue(html, 'title')),
  );
  const extractedSummary = stripMarkup(
    metaContent(html, 'og:description') || metaContent(html, 'description'),
  );
  const summary = isSourceBoilerplate(source.sourceKey, extractedSummary) ? '' : extractedSummary;
  const publishedAt = normalizeDate(metaContent(html, 'article:published_time')) ||
    normalizeDate(metaContent(html, 'datePublished')) ||
    structuredPublicationDate(source, html, canonical) ||
    sourcePageDate(source, html, canonical) ||
    (PAGE_DATED_SOURCES.has(source.sourceKey) ? null : normalizeDate(options.lastModified));
  if (!title || !publishedAt) return null;

  return {
    external_id: canonical.toString(),
    title,
    url: canonical.toString(),
    published_at: publishedAt,
    summary,
    content: summary,
    source_url: source.endpointUrl,
  };
}

function excerpt(value) {
  if (value.length <= CHANGELOG_SUMMARY_LENGTH) return value;
  const cut = value.slice(0, CHANGELOG_SUMMARY_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
}

// A rolling changelog page holds one dated section per release. Each section's own
// date and anchor are its identity, so sitemap lastmod never invents a release.
export function parseChangelogSections(source, html, requestUrl) {
  const rawCanonical = canonicalLink(html);
  const canonical = rawCanonical ? webUrl(source, rawCanonical) : webUrl(source, requestUrl);
  if (!canonical) return [];
  canonical.hash = '';

  const starts = [...html.matchAll(/<div\b[^>]*\bid=["'](\d{4})-(\d{2})-(\d{2})["'][^>]*>/gi)];
  const items = new Map();
  starts.forEach((match, index) => {
    const section = html.slice(match.index, starts[index + 1]?.index ?? html.length);
    const heading = section.match(/data-component-part=["']update-description["'][^>]*>([\s\S]*?)<\/div>/i);
    const body = section.match(/data-component-part=["']update-content["'][^>]*>([\s\S]*)$/i);
    const title = heading ? stripMarkup(heading[1]) : '';
    const publishedAt = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!title || !publishedAt) return;
    const url = new URL(canonical);
    url.hash = `${match[1]}-${match[2]}-${match[3]}`;
    const summary = body ? excerpt(stripMarkup(body[1]).split('Was this page helpful?')[0].trim()) : '';
    items.set(url.toString(), {
      external_id: url.toString(),
      title,
      url: url.toString(),
      published_at: publishedAt,
      summary,
      content: summary,
      source_url: source.endpointUrl,
    });
  });
  return [...items.values()];
}
