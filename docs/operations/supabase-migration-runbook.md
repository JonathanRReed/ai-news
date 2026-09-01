# Supabase intelligence migration runbook

Project reference: `arejerdupcduqhgdoyht`

This migration is additive, but production work remains backup-first. Do not run a migration command until the authenticated export gate below is complete. Store credentials only in the shell environment. Never paste them into a command transcript, receipt, source file, or GitHub secret log.

## 1. Preconditions

- Confirm the dashboard project reference, region, database version, health, and current row count.
- Confirm `git status --short` and record the exact migration file hashes.
- Confirm native PostgreSQL 18 client tools are available at `/opt/homebrew/opt/libpq/bin`. Native dumps do not require Docker.
- Set a percent-encoded session-pooler database URL in `AI_NEWS_DB_URL` without printing it. Use the direct database URL only when the host has working IPv6 connectivity.
- Create a private, ignored receipt directory with mode `0700`.

```sh
install -d -m 0700 docs/operations/receipts/production-export
```

## 2. Authenticated export gate

Export roles, complete schema, complete data, a full restore archive, and an independently inspectable copy of the legacy table. The export must include `public.ai_company_news` and the legacy functions and triggers, not only rows reachable through the anonymous API. Role passwords are deliberately excluded from the roles export.

```sh
AI_NEWS_PG_BIN=/opt/homebrew/opt/libpq/bin
AI_NEWS_EXPORT_DIR=docs/operations/receipts/production-export

"$AI_NEWS_PG_BIN/pg_dumpall" \
  --dbname="$AI_NEWS_DB_URL" \
  --roles-only \
  --no-role-passwords \
  --file="$AI_NEWS_EXPORT_DIR/roles.sql"

"$AI_NEWS_PG_BIN/pg_dump" \
  --dbname="$AI_NEWS_DB_URL" \
  --schema-only \
  --file="$AI_NEWS_EXPORT_DIR/schema.sql"

"$AI_NEWS_PG_BIN/pg_dump" \
  --dbname="$AI_NEWS_DB_URL" \
  --data-only \
  --format=custom \
  --file="$AI_NEWS_EXPORT_DIR/data.dump"

"$AI_NEWS_PG_BIN/pg_dump" \
  --dbname="$AI_NEWS_DB_URL" \
  --format=custom \
  --file="$AI_NEWS_EXPORT_DIR/full.dump"

"$AI_NEWS_PG_BIN/pg_dump" \
  --dbname="$AI_NEWS_DB_URL" \
  --data-only \
  --table=public.ai_company_news \
  --strict-names \
  --file="$AI_NEWS_EXPORT_DIR/legacy-ai-company-news.sql"

"$AI_NEWS_PG_BIN/psql" \
  --no-psqlrc \
  --set=ON_ERROR_STOP=1 \
  --tuples-only \
  --no-align \
  --dbname="$AI_NEWS_DB_URL" \
  --command='select count(*) from public.ai_company_news;' \
  > "$AI_NEWS_EXPORT_DIR/legacy-row-count.txt"

"$AI_NEWS_PG_BIN/pg_restore" \
  --list "$AI_NEWS_EXPORT_DIR/full.dump" \
  > "$AI_NEWS_EXPORT_DIR/full.contents.txt"

chmod 0600 "$AI_NEWS_EXPORT_DIR"/*
shasum -a 256 \
  "$AI_NEWS_EXPORT_DIR/roles.sql" \
  "$AI_NEWS_EXPORT_DIR/schema.sql" \
  "$AI_NEWS_EXPORT_DIR/data.dump" \
  "$AI_NEWS_EXPORT_DIR/full.dump" \
  "$AI_NEWS_EXPORT_DIR/legacy-ai-company-news.sql" \
  "$AI_NEWS_EXPORT_DIR/legacy-row-count.txt" \
  "$AI_NEWS_EXPORT_DIR/full.contents.txt" \
  > "$AI_NEWS_EXPORT_DIR/SHA256SUMS"

shasum -a 256 --check "$AI_NEWS_EXPORT_DIR/SHA256SUMS"
```

Gate requirements:

- Every dump, inventory, listing, and hash command exits zero.
- Every listed file is non-empty, mode `0600`, and has a verified SHA-256 hash.
- `roles.sql` contains role definitions but no password verifiers.
- `schema.sql` contains the legacy table, trigger, cleanup functions, RLS policy, grants, and cron-related function definitions.
- `full.contents.txt` lists both schema and data objects for the full archive.
- `legacy-row-count.txt` contains exactly the expected legacy row count before migration.
- `legacy-ai-company-news.sql` is non-empty and can be inspected without unpacking the complete data archive.
- The public 2,677-row export and the authenticated legacy table export reconcile by legacy ID.

If any item fails, stop. Do not migrate.

## 3. Local database verification

```sh
bunx supabase start
bunx supabase test db
bunx supabase db lint --local --level warning
bunx supabase stop --no-backup
```

The local database gate requires Docker, all pgTAP tests to pass, and no migration parse error. `--no-backup` deletes only this disposable local Supabase volume after the tests.

## 4. Production dry run

```sh
bunx supabase db push --db-url "$AI_NEWS_DB_URL" --include-all --include-seed --skip-vault --dry-run
```

Review the printed migration list. It must contain only:

1. `20260830000100_intelligence_foundation.sql`
2. `20260830000200_legacy_compatibility.sql`
3. `20260901000100_safe_article_route_ids.sql`
4. `20260901000200_legacy_event_hardening.sql`
5. `20260901000300_remove_duplicate_legacy_constraint.sql`
6. `20260901000400_register_migration_history.sql`

The dry run must not show a destructive legacy table alteration or deletion.

## 5. Production apply

This is the action-time production mutation gate. Obtain explicit user confirmation immediately before running it.

```sh
bunx supabase db push --db-url "$AI_NEWS_DB_URL" --include-all --include-seed --skip-vault
bun scripts/intelligence/apply-backfill.mjs docs/operations/receipts/backfill-2026-08-31T18-04-28.632Z.json
bun scripts/intelligence/ingest.mjs
bun scripts/intelligence/export-cache.mjs
bun scripts/intelligence/verify-routes.mjs
```

Required environment variables for the data commands are the project URL and service-role key. Keep the key out of command arguments so it is not retained in shell history.

The approved local backfill bundle contains 2,901 canonical items and 3,145
route aliases with zero quarantines, collisions, or unexplained losses. Its
SHA-256 is
`5b7caf156f899236505b46b67d26b54d4959b6165c9bf313e0e8dc6a414c8ddc`.

## 6. Post-migration verification

- Re-run the read-only inventory queries and compare catalog counts, grants, policies, functions, triggers, and view definitions with the baseline.
- Verify all legacy IDs resolve through `route_aliases` and existing `/article/:id/` routes.
- Verify browser roles can select public projections but cannot insert, update, delete, execute admin RPCs, or read `private` tables.
- Run a live ingestion and confirm each source records an independent status. A failing optional source must not erase successful items.
- Request the versioned feed as an anonymous client and verify keyset pagination.
- Verify the deployed site in Helium across Latest, Major Updates, labs, harnesses, watchlist, daily digest, RSS, JSON, loading, empty, and degraded states.

## 7. Recovery

The foundation migration is additive and the legacy table remains intact. If the new read path fails:

1. Stop the refresh workflow.
2. Point the site back to the verified static cache.
3. Do not drop new tables during the incident.
4. Restore missing legacy objects from the authenticated schema dump only after comparing definitions.
5. Restore legacy rows from `legacy-ai-company-news.sql`, or from `data.dump` after selecting the exact table, only when a row-level reconciliation proves loss.

Dropping the new schema or restoring a full dump is a separate destructive action and requires a new explicit confirmation.

## 8. Verified production receipt, 2026-09-01

- Production project: `ai-news`, reference `arejerdupcduqhgdoyht`.
- Applied migration history: `20260830000100`, `20260830000200`, `20260901000100`, `20260901000200`, `20260901000300`, and `20260901000400`.
- Legacy preservation: 2,677 legacy rows; zero missing normalized content items, route aliases, events, event items, or event entities.
- Normalized totals after the authoritative Hermes refresh: 3,185 content items, 3,148 route aliases, 3,185 content-item entities, 3,185 events, 3,185 event items, and 3,185 event entities.
- Hermes Agent now uses the authoritative `NousResearch/hermes-agent` repository and release feed. Production contains 10 current Hermes items and zero items from the stale mirror source.
- The duplicate legacy index and redundant legacy constraint were removed. Missing foreign-key indexes and mutable function search paths were repaired.
- Security and performance advisors report no application-owned warning after the migration set. The remaining performance warning is the Supabase-managed PostgreSQL patch level.
- Legacy route verification joins `public.content_items.legacy_id` to `public.ai_company_news.id::text`; imported normalized UUIDs are deterministic derived identifiers and are not expected to equal legacy IDs.
