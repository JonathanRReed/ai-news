# AI News

AI News is a free, primary-source intelligence index for AI labs, model providers, research organizations, and agent harnesses. It preserves publisher titles, dates, URLs, and provenance, then makes the record available through chronological pages, explainable Major Updates, permanent digests, RSS, and JSON.

The public site is [ai-news.helloworldfirm.com](https://ai-news.helloworldfirm.com).

## Product surfaces

- Latest: reverse-chronological first-party updates with shareable filters
- Major Updates: conservative headline rules with a visible promotion reason
- Labs and providers: registry and source-ledger pages for Z.AI, Moonshot AI, OpenAI, Anthropic, DeepMind, and more
- Harnesses: Hermes Agent, OpenClaw, OpenHands, Aider, Cline, Roo Code, model-provider CLIs, and related tools
- Entity intelligence: permanent pages, source health, local watch controls, RSS, and JSON
- Digests: permanent UTC daily archives plus weekly digests
- Watchlists: browser-local only, with no account or server profile
- Degraded mode: the last verified static cache remains usable when Supabase is unavailable

The source admission policy is in [docs/operations/source-admission.md](docs/operations/source-admission.md). Product rules are in [PRODUCT.md](PRODUCT.md).

## Stack

- Astro 7 static output and React 19 islands
- Bun 1.4 for package management, scripts, and tests
- Tailwind CSS 4 with the existing black, white, and red industrial design system
- Supabase Postgres with RLS, browser-safe read views, and service-role ingestion functions
- Cloudflare Pages for the static site

## Setup

```sh
git clone https://github.com/JonathanRReed/ai-news.git
cd ai-news
bun install
cp .env.example .env
bun run dev
```

Use only the public Supabase URL and anonymous key in `PUBLIC_*` variables. The service-role key is server and workflow only. Never commit credentials.

## Commands

```sh
bun run lint
bun run check
bun test
bun run build
bun run test:e2e
bun run sources:validate
bun run sources:seed
bun run ingest
bun run cache:export
bun run verify:routes
bun run test:db
```

Database tests require a running local Supabase stack. The complete backup-first production procedure is in [docs/operations/supabase-migration-runbook.md](docs/operations/supabase-migration-runbook.md).

## Data model

The generated catalog in `src/data/intelligence-catalog.json` and `supabase/seed.sql` comes from one authority, `config/intelligence-sources.mjs`. The normalized database stores entities, sources, immutable content items, conservative one-record events, relationships, route aliases, and private ingestion receipts.

Refreshes are additive. A source failure cannot delete history. Existing `/article/:id/` routes remain valid through aliases, and the checked-in cache provides static fallback reads.

## Feeds

- `/feed.xml` and `/articles.json` for the complete public cache
- `/feed/major.xml` for explainable Major Updates
- `/feed/labs.xml` and `/feed/harnesses.xml` for section feeds
- `/feed/entity/{slug}.xml` and `/feed/entity/{slug}.json` for every admitted entity
- `/feed/topic/{slug}.xml` for topic feeds

All feeds are public and keyless.
