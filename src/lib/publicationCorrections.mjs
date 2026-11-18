import verifiedCorrections from "../data/publication-corrections.json" with { type: "json" };

// Stored records are immutable, so a wrong date is corrected here, at export and at read time.
// Each row was verified against the publisher's own page by
// scripts/intelligence/verify-publication-dates.mjs (older sitemap records were dated from
// lastmod, which tracks edits, not publication).
const correctionByRecord = new Map(
  verifiedCorrections.map((row) => [`${row.sourceKey}\n${row.url}`, row]),
);

export function correctedPublicationDate(sourceKey, url, publishedAt) {
  // Verified against the publisher's BlogPosting JSON-LD on 2026-10-16.
  // https://cohere.com/blog/ai-in-oil-and-gas lists datePublished separately from dateModified.
  if (sourceKey === 'cohere-sitemap'
    && url === 'https://cohere.com/blog/ai-in-oil-and-gas'
    && Date.parse(publishedAt) === Date.parse('2026-09-30T00:00:00Z')) {
    return '2025-01-29T15:38:00.000Z';
  }
  // Only the exact stored timestamp is corrected, so a record that is later re-ingested
  // with the publisher's date is left alone.
  const correction = correctionByRecord.get(`${sourceKey}\n${url}`);
  return correction && Date.parse(publishedAt) === Date.parse(correction.recorded)
    ? correction.published_at
    : publishedAt;
}
