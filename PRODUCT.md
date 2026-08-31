# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AI News serves people who need to understand what is changing across AI labs,
model providers, research organizations, and agent harnesses without monitoring
dozens of first-party channels themselves.

The primary job is to answer four questions quickly:

1. What changed?
2. Who published or shipped it?
3. Which first-party artifact proves it?
4. How does it relate to earlier or later updates?

## Product Purpose

AI News is a free AI intelligence index. It turns fragmented first-party
announcements into a chronological, attributable, queryable record organized by
labs, models, harnesses, research, and related entities.

Success means the index is current, complete enough to replace manual source
checking, transparent about provenance, and dependable as a permanent public
record.

## Positioning

AI News is not a generic AI-summary publication. Its durable advantage is an
event-centered record of what changed, who claimed it, which primary artifact
supports it, and how the event developed over time.

## Operating Context

- The default experience is a reverse-chronological feed.
- A separate Major Updates view uses explainable event rules, not engagement.
- Readers navigate by entity and type, including labs, providers, models,
  harnesses, and research.
- Filters are shareable URLs and can produce matching RSS and JSON feeds.
- Watchlists are stored locally in the browser. Accounts are not required.
- Daily and weekly digests are public, permanent pages.

## Capabilities and Constraints

- The complete core product is free to readers.
- The core must not depend on paid AI APIs.
- The operating target is zero-dollar infrastructure where practical, using
  the existing Supabase, Cloudflare, and GitHub allowances.
- First-party sources are canonical. Independent reporting may support an
  existing event, but cannot become its source of record.
- Labs and providers need a stable first-party newsroom, changelog, model card,
  documentation feed, API, or official repository before inclusion.
- Harnesses need an actively maintained official repository or release channel.
- New and unstable projects remain on a watchlist until they satisfy the source
  admission policy.
- Official excerpts and deterministic structured metadata replace paid,
  generated summaries in the core experience.
- Latest is strictly chronological. Major Updates is rules-based and
  explainable.
- There is no sponsored placement, opaque trending score, or popularity-based
  ranking.
- Every imported article is an immutable source record.
- Event clustering is conservative. Ambiguous records remain separate until
  verified.
- Published routes are permanent. Renames produce aliases or redirects instead
  of deleting history.
- Production database changes are backup-first, additive, reversible, and
  migration-controlled.
- No destructive cleanup is allowed without a separate review.

## Brand Commitments

- Preserve the name AI News.
- Preserve the existing focused editorial identity while improving hierarchy,
  provenance, discovery, responsiveness, and accessibility.
- Product language must be direct, factual, and specific. It must distinguish
  publisher claims from verified facts and supporting coverage.

## Evidence on Hand

- The existing Astro application and its black-and-red editorial interface.
- A checked-in provider article cache used for static pages and fallback reads.
- A live Supabase project containing a larger but differently composed corpus.
- Existing permanent article, story, digest, RSS, JSON, model, and sitemap
  routes.
- Existing provider logos and public brand assets.
- No testimonials, reader research, or usage-based ranking evidence is present.
  Future work must not fabricate it.

## Product Principles

1. Primary evidence before interpretation.
2. Permanent history before feed churn.
3. Transparent rules before opaque ranking.
4. A complete free core before optional enrichment.
5. Structured intelligence before generic summaries.

## Accessibility & Inclusion

The public experience must support keyboard navigation, visible focus,
responsive layouts, reduced motion, semantic structure, and WCAG 2.2 AA color
contrast for text and controls.
