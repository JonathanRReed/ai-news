import { admittedHttpsUrl } from './source-policy.mjs';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXml(value) {
  return String(value ?? '')
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

function blocks(xml, tagName) {
  const tag = escapeRegExp(tagName);
  return [...String(xml).matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi'))]
    .map((match) => match[0]);
}

function tagValue(xml, tagName) {
  const tag = escapeRegExp(tagName);
  const match = String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function attrValue(tag, attrName) {
  const attr = escapeRegExp(attrName);
  const match = String(tag).match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function validWebUrl(source, value) {
  try {
    return admittedHttpsUrl(source, stripMarkup(value)).toString();
  } catch {
    return '';
  }
}

function validDate(value) {
  const date = new Date(stripMarkup(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function atomLink(entry) {
  const links = [...entry.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const alternate = links.find((link) => {
    const rel = attrValue(link, 'rel');
    return !rel || rel === 'alternate';
  });
  return alternate ? attrValue(alternate, 'href') : tagValue(entry, 'link');
}

export function parseRss(source, xml, options = {}) {
  const maxItems = options.maxItems ?? 100;
  return blocks(xml, 'item').slice(0, maxItems).map((item) => {
    const url = validWebUrl(source, tagValue(item, 'link') || tagValue(item, 'guid'));
    const title = stripMarkup(tagValue(item, 'title'));
    const publishedAt = validDate(tagValue(item, 'pubDate') || tagValue(item, 'dc:date'));
    const summary = stripMarkup(
      tagValue(item, 'description') || tagValue(item, 'media:description'),
    );
    const content = stripMarkup(tagValue(item, 'content:encoded')) || summary;
    const externalId = stripMarkup(tagValue(item, 'guid')) || url;

    if (!title || !url || !publishedAt) return null;
    return {
      external_id: externalId,
      title,
      url,
      published_at: publishedAt,
      summary,
      content,
      source_url: source.endpointUrl,
    };
  }).filter(Boolean);
}

export function parseAtom(source, xml, options = {}) {
  const maxItems = options.maxItems ?? 100;
  return blocks(xml, 'entry').slice(0, maxItems).map((entry) => {
    const url = validWebUrl(source, atomLink(entry) || tagValue(entry, 'id'));
    const title = stripMarkup(tagValue(entry, 'title'));
    const publishedAt = validDate(tagValue(entry, 'published') || tagValue(entry, 'updated'));
    const content = stripMarkup(tagValue(entry, 'summary') || tagValue(entry, 'content'));
    const externalId = stripMarkup(tagValue(entry, 'id')) || url;

    if (!title || !url || !publishedAt) return null;
    return {
      external_id: externalId,
      title,
      url,
      published_at: publishedAt,
      summary: content,
      content,
      source_url: source.endpointUrl,
    };
  }).filter(Boolean);
}

export const feedParserInternals = {
  blocks,
  decodeXml,
  stripMarkup,
  tagValue,
};
