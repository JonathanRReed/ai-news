import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { mergeProviderArticles } from './merge-provider-articles.mjs';
import {
  admittedHttpsUrl,
  fetchAdmittedResponse,
  readBoundedText,
} from './intelligence/source-policy.mjs';

const feeds = [
  {
    company: 'OpenAI',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://openai.com/news/rss.xml',
  },
  {
    company: 'Google DeepMind',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://deepmind.google/blog/rss.xml',
  },
  {
    company: 'Hugging Face',
    sourceType: 'rss_official',
    kind: 'rss',
    url: 'https://huggingface.co/blog/feed.xml',
  },
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
const maxFeedBytes = 2 * 1024 * 1024;
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

function sourcePolicy(feed) {
  return {
    sourceKey: `${feed.company}-legacy-feed`,
    officialUrl: feed.url,
    endpointUrl: feed.url,
    allowedHosts: feed.allowedHosts ?? [],
  };
}

function normalizeUrl(feed, value) {
  try {
    return admittedHttpsUrl(sourcePolicy(feed), stripMarkup(value)).toString();
  } catch {
    return '';
  }
}

function parseRss(feed, xml) {
  return blocks(xml, 'item').slice(0, maxItemsPerFeed).map((item) => {
    const rawUrl = tagValue(item, 'link') || tagValue(item, 'guid');
    const url = normalizeUrl(feed, rawUrl);
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
    const url = normalizeUrl(feed, atomLink(entry) || tagValue(entry, 'id'));
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
  const response = await fetchAdmittedResponse(sourcePolicy(feed), feed.url, {
    fetchImpl: fetchApi,
    headers: {
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'user-agent': 'ai-news-local-gatherer/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const xml = await readBoundedText(response, maxFeedBytes);
  return feed.kind === 'atom' ? parseAtom(feed, xml) : parseRss(feed, xml);
}

const gathered = [];
const failures = [];

for (const feed of feeds) {
  try {
    const articles = await fetchFeed(feed);
    if (articles.length === 0) {
      // HTTP 200 but zero parsed items (markup change / bot-check page / transient empty):
      // treat as a failure so this feed's cached articles are preserved, not dropped.
      failures.push({ company: feed.company, url: feed.url, error: 'parsed 0 items' });
      console.error(`${feed.company}: 0 items from ${feed.url} (preserving cached entries)`);
    } else {
      gathered.push(...articles);
      console.log(`${feed.company}: ${articles.length} from ${feed.url}`);
    }
  } catch (error) {
    failures.push({ company: feed.company, url: feed.url, error: error.message });
    console.error(`${feed.company}: failed ${feed.url}, ${error.message}`);
  }
}

// Preserve previously-cached articles for any feed that failed this run, so a transient
// outage in one provider doesn't drop its stories (or, on total failure, wipe the cache).
let existing = [];
try {
  const parsed = JSON.parse(await readFile(outputPath, 'utf8'));
  if (Array.isArray(parsed)) existing = parsed;
} catch {
  existing = [];
}
const feedByUrl = new Map(feeds.map((feed) => [feed.url, feed]));
const admitArticle = (article) => {
  const feed = feedByUrl.get(article.source_url);
  if (!feed) return false;
  try {
    admittedHttpsUrl(sourcePolicy(feed), article.url);
    return true;
  } catch {
    return false;
  }
};
const articles = mergeProviderArticles(gathered, existing, { admitArticle });
if (articles.length === 0) {
  throw new Error('Refusing to publish an empty admitted cache.');
}

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
