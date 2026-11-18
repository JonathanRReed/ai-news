# Changelog

## 1.1.0 (2026-11-18)

- The homepage leads with the feed. Rows are a ruled ledger under UTC day headers, one project's pre-release builds per day fold into a single expandable row, and a record-type filter (`?type=news` or `?type=releases`) separates news from software releases.
- Major updates recognises Claude tier names, no longer promotes customer stories that only use a model, and says when the named model belongs to another maker.
- 221 records that carried a sitemap edit date now show the publication date from the publisher's own page (`bun run dates:verify`). Daily pages emptied by a correction stay published.
- Fixed in the browser feed: Google DeepMind collapsing to one record, the search field refusing spaces, and the snapshot fallback stopping at 20 stories.
- Publishers without a logo show a lettered monogram. Read rows keep AA contrast.
- Build time roughly halved by caching the admitted article list.
- Dependencies updated to clear 16 audit advisories (astro, undici through wrangler, fast-uri, minimatch). The deprecated `eslint-plugin-react-compiler` was removed because it pinned an unpatched zod 3; its rules live in `eslint-plugin-react-hooks`.

## 2026-04-19

- Merged PR #1, [docs: refresh ai-news README](https://github.com/JonathanRReed/ai-news/pull/1), commit [e6641b5](https://github.com/JonathanRReed/ai-news/commit/e6641b5f8d02f41accc6826753a7cbfeea3ec780).
