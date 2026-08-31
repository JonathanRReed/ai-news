# Supabase Production Baseline

**Captured:** 2026-08-30 America/Chicago

**Project ref:** `arejerdupcduqhgdoyht`

This is a sanitized, read-only inventory captured through the authenticated
Supabase SQL editor. It contains no keys, passwords, cron command bodies, or
private job payloads. It is not a substitute for the complete ignored export
required before migration.

## Platform

- PostgreSQL: 15.8
- Database size: 26 MB
- Public relation count: one base table
- Legacy table size: 4,096 kB
- Legacy rows: 2,674
- Legacy date range: 2015-12-11 08:00:00+00 through 2026-08-28 06:00:00+00
- Dashboard project state at capture: healthy

## Extensions

| Extension | Version |
| --- | --- |
| http | 1.6 |
| pg_cron | 1.6 |
| pg_net | 0.14.0 |
| pg_stat_statements | 1.10 |
| pgcrypto | 1.3 |
| pgjwt | 0.2.0 |
| plpgsql | 1.0 |
| supabase_vault | 0.3.1 |
| uuid-ossp | 1.1 |

## Legacy table

`public.ai_company_news` is owned by `postgres`, has RLS enabled, and is not
forced through RLS for its owner.

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | no | uuid_generate_v4() |
| company | varchar | no | |
| title | text | no | |
| url | text | no | |
| content | text | yes | |
| summary | text | yes | |
| published_at | timestamptz | no | |
| source_type | news_source_type | no | |
| source_url | text | no | |
| created_at | timestamptz | yes | now() |

The `news_source_type` enum contains `rss_official`, `rss_unofficial`, and
`scraped`.

The table has a primary key on `id`, a unique index on `url`, two equivalent
unique constraints on `(company, url)`, and non-unique indexes on `company` and
`published_at`.

## Access and retention

One permissive `SELECT` policy allows public reads. The `anon` and
`authenticated` roles currently have broad table-level grants, including
mutation privileges, but RLS has no mutation policy. This is defense by a
single control and should be replaced with explicit read-only grants.

Two public PL/pgSQL functions exist:

- `cleanup_old_news()` deletes rows older than one year;
- `delete_old_news()` is a trigger function that deletes rows older than one
  year after each insert.

One `AFTER INSERT` trigger calls `delete_old_news()`. Two active `pg_cron` jobs
exist:

- job 20 runs daily and references a delete against the legacy table;
- job 21 runs hourly and references an HTTP function.

The command bodies were intentionally excluded. Their non-secret fingerprints
at capture were:

- job 20: `dc64aea3d6d1298acfaa2ea02d5fbc1a`, 96 characters;
- job 21: `31dc83d283395ff1f6c2ffd36f325346`, 461 characters.

The additive migration does not remove or rewrite these jobs, functions,
triggers, or the legacy table. Canonical intelligence records use a separate
immutable lifecycle. Any later retirement of legacy retention needs its own
review, backup, and explicit production change.

## Migration gate

This document was the pre-migration gate. On 2026-08-31, the signed-in Supabase
dashboard captured 2,675 legacy rows in `migration_backup_20260831` with checksum
`4c3e8a0a8b096be31be4628b8f07c0a5` before the additive foundation and
compatibility migrations were applied. Operational receipts remain local and
ignored so production credentials and raw backup contents never enter Git.
