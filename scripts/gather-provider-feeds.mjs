/* global console */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const feeds = [
  {
    company: 'DeepSeek',
    sourceType: 'rss_official',
    kind: 'atom',
    url: 'https://github.com/deepseek-ai/DeepSeek-V3/releases.atom',
  },
  {
    company: 'DeepSeek',
    sourceType: 'rss_official',
    kind: 'atom',
    url: 'https://github.com/deepseek-ai/DeepGEMM/releases.atom',
  },
  {
    company: 'IBM Research',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://research.ibm.com/rss',
  },
  {
    company: 'Amazon AI',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
  },
  {
    company: 'Amazon AI',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://www.amazon.science/index.rss',
  },
  {
    company: 'NVIDIA AI',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://blogs.nvidia.com/feed/',
  },
  {
    company: 'NVIDIA AI',
    sourceType: 'rss_official',
    kind: 'atom',
    url: 'https://developer.nvidia.com/blog/category/generative-ai/feed/',
  },
  {
    company: 'Alibaba Qwen',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://qwenlm.github.io/blog/index.xml',
  },
];

const outputPath = new URL('../public/data/provider-articles.json', import.meta.url);
const maxItemsPerFeed = 80;
const fetchApi = globalThis.fetch;

if (typeof fetchApi !== 'function') {
  throw new Error('This script requires Node.js 20 or newer with global fetch support.');
}

function stableId(company, url) {
  return `provider-${createHash('sha256').update(`${company}:${url}`).digest('hex').slice(0, 18)}`;
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripMarkup(value) {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blocks(xml, tagName) {
  const tag = escapeRegExp(tagName);
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi'))].map((match) => match[0]);
}

function tagValue(xml, tagName) {
  const tag = escapeRegExp(tagName);
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function attrValue(tag, attrName) {
  const attr = escapeRegExp(attrName);
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function atomLink(entry) {
  const links = [...entry.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const alternate = links.find((link) => {
    const rel = attrValue(link, 'rel');
    return !rel || rel === 'alternate';
  });
  const href = alternate ? attrValue(alternate, 'href') : '';
  return href || tagValue(entry, 'link');
}

function normalizeDate(value) {
  const date = value ? new Date(stripMarkup(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeUrl(value) {
  try {
    const url = new URL(stripMarkup(value));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function parseRss(feed, xml) {
  return blocks(xml, 'item').slice(0, maxItemsPerFeed).map((item) => {
    const rawUrl = tagValue(item, 'link') || tagValue(item, 'guid');
    const url = normalizeUrl(rawUrl);
    const title = stripMarkup(tagValue(item, 'title'));
    const content = stripMarkup(
      tagValue(item, 'description') ||
      tagValue(item, 'content:encoded') ||
      tagValue(item, 'media:description')
    );

    if (!title || !url) return null;

    return {
      id: stableId(feed.company, url),
      company: feed.company,
      title,
      url,
      published_at: normalizeDate(tagValue(item, 'pubDate') || tagValue(item, 'dc:date')),
      source_type: feed.sourceType,
      summary: content.slice(0, 500),
      content,
      source_url: feed.url,
    };
  }).filter(Boolean);
}

function parseAtom(feed, xml) {
  return blocks(xml, 'entry').slice(0, maxItemsPerFeed).map((entry) => {
    const url = normalizeUrl(atomLink(entry) || tagValue(entry, 'id'));
    const title = stripMarkup(tagValue(entry, 'title'));
    const content = stripMarkup(tagValue(entry, 'summary') || tagValue(entry, 'content'));

    if (!title || !url) return null;

    return {
      id: stableId(feed.company, url),
      company: feed.company,
      title,
      url,
      published_at: normalizeDate(tagValue(entry, 'published') || tagValue(entry, 'updated')),
      source_type: feed.sourceType,
      summary: content.slice(0, 500),
      content,
      source_url: feed.url,
    };
  }).filter(Boolean);
}

async function fetchFeed(feed) {
  const response = await fetchApi(feed.url, {
    headers: {
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'user-agent': 'ai-news-local-gatherer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return feed.kind === 'atom' ? parseAtom(feed, xml) : parseRss(feed, xml);
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = `${article.company}:${article.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareNewest(a, b) {
  return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
}

const gathered = [];
const failures = [];

for (const feed of feeds) {
  try {
    const articles = await fetchFeed(feed);
    gathered.push(...articles);
    console.log(`${feed.company}: ${articles.length} from ${feed.url}`);
  } catch (error) {
    failures.push({ company: feed.company, url: feed.url, error: error.message });
    console.error(`${feed.company}: failed ${feed.url}, ${error.message}`);
  }
}

const articles = dedupeArticles(gathered).sort(compareNewest);
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(articles, null, 2)}\n`);

const counts = articles.reduce((acc, article) => {
  acc[article.company] = (acc[article.company] || 0) + 1;
  return acc;
}, {});

console.log(`Wrote ${articles.length} articles to ${outputPath.pathname}`);
console.log(JSON.stringify(counts, null, 2));

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
