---
name: AI News
description: A first-party AI release index with an industrial editorial interface and visible source receipts.
colors:
  page-black: "#050505"
  editorial-surface: "#0b0b0b"
  raised-surface: "#111111"
  primary-paper: "#f4f2ed"
  supporting-copy: "#aaa8a4"
  muted-copy: "#777570"
  signal-red: "#e4312b"
  signal-red-hover: "#ff4a42"
  rule-white: "rgba(255, 255, 255, 0.14)"
typography:
  display:
    fontFamily: "NebulaSans-Book, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.8rem, 7.5vw, 6.5rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  body:
    fontFamily: "NebulaSans-Book, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1rem, 1.4vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.68rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.09em"
rounded:
  none: "0"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  3xl: "3rem"
components:
  signal-button:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.primary-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "44px"
  receipt:
    backgroundColor: "{colors.editorial-surface}"
    textColor: "{colors.primary-paper}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
  article-card:
    backgroundColor: "{colors.page-black}"
    textColor: "{colors.primary-paper}"
    rounded: "{rounded.none}"
    padding: "{spacing.xl}"
---

# Design System: AI News

## Creative North Star

**The Industrial News Desk**

AI News should feel like a live editorial wire room built around primary evidence. The experience is urgent without becoming sensational, dense without becoming cluttered, and visibly accountable for every source. Black fields, paper-white type, signal red, hard rules, editorial scale, and monospaced receipts form the recognizable visual world.

This is an established identity. Refinement preserves the black-and-red desk, the sharp geometry, the existing logo, the chronological reading flow, and the direct factual language.

## Operating Modes

- The home feed and category indexes operate. Filters, saved state, chronology, and source condition must be immediately legible.
- Article and methodology pages read. The title, publisher, permanent route, original source, and source receipt lead the hierarchy.
- The opening persuades only by proving product scope. It must not use testimonials, popularity claims, or paid-product patterns.

## Color

- Page black and editorial surface carry the product.
- Paper white is the primary text color. Supporting copy remains comfortably readable.
- Signal red marks the current route, primary action, focus, selected filters, and important source-state boundaries.
- Healthy, stale, and failing states always include words and numbers. Color never carries status alone.
- Red remains scarce enough to communicate action and urgency. It is not a general decoration.

## Typography

- Display type is wide, compressed by tight line-height, and reserved for route-level statements.
- Body type is calm and readable, with a maximum useful measure near 72 characters.
- Mono type identifies dates, source keys, labels, counts, filters, and health receipts.
- Uppercase is limited to short labels and operational controls. Article titles use normal title casing from the publisher.
- Long titles wrap. They are never allowed to clip or force horizontal overflow.

## Layout

- The global container uses a consistent page gutter and broad desktop measure.
- Structure comes from one-pixel rules, shared grid lines, and tonal surfaces, not rounded card stacks.
- The opening balances an editorial headline with a compact scope ledger. On mobile the ledger follows the statement.
- The feed stays chronological. One lead item may receive more space, but it does not imply an editorial recommendation.
- Source receipts sit beside the claim they qualify or immediately after it.
- Article previews remain bounded. Permanent article routes show a clearly labeled preview and send readers to the original source for the complete text.

## Components

### Navigation

- Desktop navigation is a ruled horizontal strip with a red current-route cell.
- Mobile navigation uses one visible menu control with a 44px minimum target, clear current-page state, and a direct close action.

### Article Cards

- A card contains publisher, time, record type, title, optional bounded excerpt, permanent local route, save control, and explicit original-source link.
- The title opens the permanent AI News record. The original-source link remains visually distinct and opens the publisher artifact.
- Read state may reduce emphasis but must preserve contrast and recover on hover or focus.

### Source Health

- Health receipts show last check, last success, latest item, item count when available, and consecutive failures.
- Loading, missing, stale, failing, and healthy states must all fit the same structure without layout shifts.
- Registry verification and live fetch health are separate facts and must not be conflated.

### Filters and Search

- Filters use rectangular controls, sharp borders, visible pressed state, and keyboard focus.
- Long provider sets may scroll within their own labeled region. The page itself must not overflow horizontally.
- Search, provider, topic, read state, and density remain independent controls with a visible result scope.

## Motion and Interaction

- Motion is limited to state tracking: navigation feedback, disclosure, save state, and bounded list updates.
- No autoplay, ticker, marquee, parallax, or scroll hijacking.
- Reduced motion removes nonessential transitions.
- Keyboard shortcuts are optional accelerators. Every action also has a visible control or normal link.

## Accessibility

- Meet WCAG 2.2 AA contrast for text and controls.
- Keep visible focus on every link, button, filter, and disclosure.
- Preserve semantic headings, landmarks, time elements, source labels, and status announcements.
- Touch targets are at least 44px where controls are not embedded in dense editorial text.
- Desktop, tablet, and mobile layouts have no clipped text or page-level horizontal overflow.

## Content Rules

- State what the publisher released or claimed. Do not generate replacement summaries in the free core.
- Call a source healthy only when the live receipt supports it.
- Call the feed chronological, not trending or popular.
- Use "Major update" only when the disclosed deterministic rules apply.
- Distinguish an official excerpt, deterministic metadata, and independent supporting coverage.
- Do not use em dashes, emojis, social proof, recommendations, or engagement language.

## Performance Budget

- No paid AI dependency and no new chart or motion dependency.
- The checked-in cache renders immediately. Live data hydrates without erasing valid static content.
- Long source text is bounded before it reaches a card or article preview.
- Images include stable dimensions, meaningful alt text, and lazy loading outside the first view.

## Visual Acceptance

Verify at 390 by 844, 768 by 1024, 1280 by 800, and 1440 by 900. At every size:

- the product purpose is obvious,
- navigation remains reachable,
- the newest records remain chronological,
- source health is visible and truthfully labeled,
- long titles and excerpts do not clip,
- there is no page-level horizontal overflow,
- the result still looks unmistakably like AI News.
