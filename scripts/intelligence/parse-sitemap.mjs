import { feedParserInternals } from './parse-feed.mjs';
import { admittedHttpsUrl } from './source-policy.mjs';

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

export function parsePageMetadata(source, html, requestUrl, options = {}) {
  const rawCanonical = canonicalLink(html);
  const canonical = rawCanonical ? webUrl(source, rawCanonical) : webUrl(source, requestUrl);
  if (!canonical) return null;

  const title = stripMarkup(metaContent(html, 'og:title') || tagValue(html, 'title'));
  const summary = stripMarkup(
    metaContent(html, 'og:description') || metaContent(html, 'description'),
  );
  const publishedAt = normalizeDate(
    metaContent(html, 'article:published_time') ||
    metaContent(html, 'datePublished') ||
    options.lastModified,
  );
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
