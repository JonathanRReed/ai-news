# AI News ingestion recovery

Verified September 2, 2026 against production project `arejerdupcduqhgdoyht`.

## Repairs

1. Applied `20260902000100_restore_ingestion_excerpt_execution.sql`. The
   service role can execute the private excerpt formatter; `anon` and
   `authenticated` cannot. A rolled-back service-role write clipped an
   oversized excerpt to 498 characters. The applied migration is registered
   in `supabase_migrations.schema_migrations`.
2. Configured `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository
   Actions secrets. The existing project credential was reused, not rotated
   or published. No credential values are stored in this repository.
3. Preserved two previously published article IDs with the additive,
   conflict-checking repair in
   `repairs/2026-09-02-published-route-aliases.sql`. Both articles already
   existed under canonical legacy IDs. No article content was removed, and
   the export's missing-route safety check remains enabled.

## Verification

- GitHub refresh run: https://github.com/JonathanRReed/ai-news/actions/runs/33660037398.
  Attempt 2 passed ingestion, cache export, permanent-route verification,
  and the cache commit/push step.
- Successful database receipt: `225101ae-7873-457b-80a9-f1eae6d899a8`, completed
  `2026-09-02T17:23:13.441Z`. All 33 active sources succeeded, zero failed.
- The first recovered run processed 656 items. The second processed 323;
  conditional requests can return unchanged feeds. These counts are processed
  records, not counts of newly published articles.
- Canonical records: 3,269. Route aliases: 3,150. Legacy records: 2,679.
- Zero legacy URLs lack a canonical record. Zero canonical items lack a
  publisher or event association. Zero excerpts exceed 500 characters.
- The refreshed cache preserves every previously exported article ID, either
  as a canonical route or an alias. There are no duplicate article IDs,
  invalid route IDs, missing alias targets, or conflicting aliases.
- Local checks passed: `bun run lint`, `bun audit --json`,
  `bun run verify:routes`, and 30 focused export, route, and migration tests.

## Routine operation

The existing `refresh-feeds.yml` workflow runs every six hours and can also
be dispatched manually on `main`. It fails before replacing the cache if
any old published route would be lost. Optional source failures remain
visible in source-health receipts instead of being presented as fresh data.

An Actions success proves collection, export, and cache publication to Git.
Cloudflare deployment and the public custom-domain readback are separate
release checks. No paid infrastructure or model requests were used.
