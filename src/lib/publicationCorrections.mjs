// Verified against the publisher's BlogPosting JSON-LD on 2026-10-16.
// https://cohere.com/blog/ai-in-oil-and-gas lists datePublished separately from dateModified.
export function correctedPublicationDate(sourceKey, url, publishedAt) {
  if (sourceKey === 'cohere-sitemap'
    && url === 'https://cohere.com/blog/ai-in-oil-and-gas'
    && Date.parse(publishedAt) === Date.parse('2026-09-30T00:00:00Z')) {
    return '2025-01-29T15:38:00.000Z';
  }
  return publishedAt;
}
