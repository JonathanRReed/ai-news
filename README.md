# AI News

A free index of announcements from AI labs, model providers, research organizations, and agent projects. Records retain the publisher's title, date, URL, and source attribution.

[Live site](https://ai-news.helloworldfirm.com)

Browse updates chronologically, filter by topic or organization, or follow RSS and JSON feeds. Major Updates explains why an item was selected. Daily archives use UTC; weekly digests are also available. Watchlists stay in your browser, with no account or server profile.

Organization and project pages include source health and feeds. If Supabase is unavailable, the site uses its last verified static cache.

See the [source admission policy](docs/operations/source-admission.md) and [product rules](PRODUCT.md).

## Develop

```sh
git clone https://github.com/JonathanRReed/ai-news.git
cd ai-news
bun install
cp .env.example .env
bun run dev
```

Use only the public Supabase URL and anonymous key in `PUBLIC_*` variables. Keep the service-role key in server or workflow configuration. Never commit credentials.

The site uses Astro 7 static output, React 19 islands, Tailwind CSS 4, and Bun 1.4. Cloudflare Pages hosts the site. Supabase Postgres stores ingested records with row-level security, browser-safe read views, and service-role ingestion functions.

## Checks and operations

```sh
bun run lint
bun run check
bun test
bun run build
bun run test:e2e
bun run verify:routes
```

Source and database operations:

```sh
bun run sources:validate
bun run sources:seed
bun run ingest
bun run cache:export
bun run test:db
```

Database tests need a running local Supabase stack. Follow the backup-first [production migration runbook](docs/operations/supabase-migration-runbook.md) for production changes.

## Data

`config/intelligence-sources.mjs` defines the source catalog. It generates `src/data/intelligence-catalog.json` and `supabase/seed.sql`.

The database stores entities, sources, immutable content items, events, relationships, route aliases, and private ingestion receipts. Refreshes add records; a failed source cannot delete history. Aliases preserve existing `/article/:id/` URLs.

## Feeds

All feeds are public and need no key.

| Path | Contents |
| --- | --- |
| `/feed.xml`, `/articles.json` | Complete public cache |
| `/feed/major.xml` | Major Updates with selection reasons |
| `/feed/labs.xml`, `/feed/harnesses.xml` | Section feeds |
| `/feed/entity/{slug}.xml`, `/feed/entity/{slug}.json` | Per-entity records |
| `/feed/topic/{slug}.xml` | Topic records |
