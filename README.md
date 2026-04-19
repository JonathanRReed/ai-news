# AI News

AI News is an Astro app for tracking updates from a curated list of AI companies and labs.

This repo powers the AI News site at `ai-news.helloworldfirm.com`.

## What it does

- Aggregates articles from official RSS and Atom feeds
- Normalizes company names and logos
- Pulls in Supabase-backed article data
- Generates supplemental provider articles into `public/data/provider-articles.json`
- Ships as a fast front end built with Astro and React

## Stack

- [Astro](https://astro.build)
- [React](https://react.dev)
- [Bun](https://bun.sh)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com)

## Requirements

- Bun 1.x
- Node.js 20.3 or newer
- Supabase credentials in your environment

## Setup

```sh
bun install
```

Configure your local environment for Supabase before running the app.

## Run locally

```sh
bun run dev
```

## Common scripts

```sh
bun run build
bun run preview
bun run lint
bun run lint:fix
bun run gather:providers
```

`bun run gather:providers` refreshes the provider article cache from the official feeds listed in `src/lib/providerSources.ts`.

## Project structure

- `src/pages/index.astro` - main homepage and metadata
- `src/lib/` - feed sources, company logos, and Supabase client setup
- `src/components/` - UI components
- `scripts/gather-provider-feeds.mjs` - feed fetcher that writes the cached provider article data

## Notes

- This repo is designed to be boring in production and easy to maintain.
- If the app cannot find the Supabase env vars, it will fail fast with a clear error.
