import { parseAtom, parseRss } from './parse-feed.mjs';
import { parsePageMetadata, parseSitemap } from './parse-sitemap.mjs';
import {
  fetchAdmittedResponse,
  readBoundedText,
  SourceResponseSizeError,
  SourceUrlPolicyError,
} from './source-policy.mjs';

const USER_AGENT = 'ai-news-intelligence-index/2.0 (+https://ai-news.helloworldfirm.com)';
const MAX_SITEMAPS = 8;
const MAX_SITEMAP_PAGES = 25;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_SITEMAP_BYTES = 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

function sortableDate(value) {
  const timestamp = Date.parse(value ?? '');
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function requestHeaders(source, previousState = {}, acceptOverride = '') {
  const accept = acceptOverride || (
    source.transportType === 'sitemap'
      ? 'application/xml, text/xml;q=0.9, text/html;q=0.8'
      : 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9'
  );
  const headers = { accept, 'user-agent': USER_AGENT };
  if (previousState.etag) headers['if-none-match'] = previousState.etag;
  if (previousState.lastModified) headers['if-modified-since'] = previousState.lastModified;
  return headers;
}

function isoNow(value) {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function failedResult({ fetchedAt, httpStatus = null, error, etag = null, lastModified = null }) {
  return { status: 'failed', items: [], httpStatus, fetchedAt, etag, lastModified, error };
}

async function request(source, url, fetchImpl, headers) {
  return fetchAdmittedResponse(source, url, {
    fetchImpl,
    headers,
  });
}

async function fetchSitemapItems(source, fetchImpl, initialResponse, initialXml) {
  const discovered = parseSitemap(source, initialXml);
  const sitemapQueue = discovered.filter(({ isSitemap }) => isSitemap).slice(0, MAX_SITEMAPS);
  const pages = discovered.filter(({ isSitemap }) => !isSitemap);

  for (const entry of sitemapQueue) {
    try {
      const response = await request(source, entry.url, fetchImpl, requestHeaders(source));
      if (!response.ok) continue;
      const xml = await readBoundedText(response, MAX_SITEMAP_BYTES);
      pages.push(...parseSitemap(source, xml).filter(({ isSitemap }) => !isSitemap));
    } catch {
      // One nested sitemap cannot erase valid pages from other sitemap files.
    }
  }

  const uniquePages = [...new Map(pages.map((entry) => [entry.url, entry])).values()]
    .sort((left, right) => (
      sortableDate(right.lastModified) - sortableDate(left.lastModified)
      || left.url.localeCompare(right.url)
    ))
    .slice(0, MAX_SITEMAP_PAGES);
  const items = [];

  for (const page of uniquePages) {
    try {
      const response = await request(
        source,
        page.url,
        fetchImpl,
        requestHeaders(source, {}, 'text/html, application/xhtml+xml;q=0.9'),
      );
      if (!response.ok) continue;
      const html = await readBoundedText(response, MAX_HTML_BYTES);
      const item = parsePageMetadata(source, html, page.url, {
        lastModified: page.lastModified,
      });
      if (item) items.push(item);
    } catch {
      // A single malformed or unavailable page is isolated to that page.
    }
  }

  return { items, httpStatus: initialResponse.status };
}

export async function fetchSource(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const previousState = options.previousState ?? {};
  const fetchedAt = isoNow(options.now);
  if (typeof fetchImpl !== 'function') {
    return failedResult({ fetchedAt, error: 'network fetch is unavailable' });
  }

  try {
    const response = await request(
      source,
      source.endpointUrl,
      fetchImpl,
      requestHeaders(source, previousState),
    );
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    if (response.status === 304) {
      return {
        status: 'not_modified',
        items: [],
        httpStatus: 304,
        fetchedAt,
        etag: etag ?? previousState.etag ?? null,
        lastModified: lastModified ?? previousState.lastModified ?? null,
        error: null,
      };
    }
    if (!response.ok) {
      return failedResult({
        fetchedAt,
        httpStatus: response.status,
        etag,
        lastModified,
        error: `HTTP ${response.status}`,
      });
    }
    const body = await readBoundedText(
      response,
      source.parserKey === 'sitemap' ? MAX_SITEMAP_BYTES : MAX_FEED_BYTES,
    );
    let items;
    if (source.parserKey === 'rss') items = parseRss(source, body);
    else if (source.parserKey === 'atom') items = parseAtom(source, body);
    else if (source.parserKey === 'sitemap') {
      ({ items } = await fetchSitemapItems(source, fetchImpl, response, body));
    } else {
      return failedResult({
        fetchedAt,
        httpStatus: response.status,
        etag,
        lastModified,
        error: `unsupported parser ${source.parserKey}`,
      });
    }

    if (!items.length) {
      return failedResult({
        fetchedAt,
        httpStatus: response.status,
        etag,
        lastModified,
        error: 'parsed 0 valid items',
      });
    }

    return {
      status: 'success',
      items,
      httpStatus: response.status,
      fetchedAt,
      etag,
      lastModified,
      error: null,
    };
  } catch (error) {
    if (error instanceof SourceUrlPolicyError) {
      return failedResult({ fetchedAt, error: 'source request blocked by URL policy' });
    }
    if (error instanceof SourceResponseSizeError) {
      return failedResult({ fetchedAt, error: error.message });
    }
    return failedResult({ fetchedAt, error: 'network request failed' });
  }
}
