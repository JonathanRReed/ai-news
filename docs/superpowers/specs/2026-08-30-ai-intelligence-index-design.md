# AI Intelligence Index Design

**Date:** 2026-08-30

**Status:** Proposed for written-spec review

**Product record:** `PRODUCT.md`

## Summary

AI News will evolve from a split static and Supabase feed into a free,
event-centered AI intelligence index. First-party records remain the source of
truth. The product organizes them by labs, providers, models, harnesses,
research, and related entities, then connects records into conservative event
timelines without destroying their original identity or URLs.

The work is architectural and spans independent subsystems. It will be
implemented as three separately reviewable programs:

1. **Foundation:** reproducible Supabase schema, source registry, ingestion,
   canonical content records, event primitives, compatibility reads, backups,
   and migration controls.
2. **Intelligence experience:** entity directories, event pages, provenance,
   Major Updates, durable filter URLs, and responsive navigation.
3. **Reader utilities:** local watchlists, filtered RSS and JSON feeds, and
   permanent daily and weekly digests.

The first implementation plan will cover Foundation only. It produces a useful,
testable backend and preserves the current frontend through a compatibility
contract. The other programs receive their own specifications after Foundation
is verified.

## Approved Product Decisions

1. AI News is an AI intelligence index, not a generic AI publication.
2. The complete core is free and has no paid-model dependency.
3. Inclusion is curated and requires a stable first-party source.
4. Latest is strictly chronological. Major Updates is separate and
   explainable.
5. Source records are immutable and may join conservative event clusters.
6. The initial product has no accounts. Personal preferences remain local.
7. Production migration is backup-first, additive, reversible, and preserves
   the old system until verification passes.

## Current-State Findings

The repository is an Astro 7 static site with React islands, Bun, Tailwind, and
Cloudflare Pages. It reads from two disconnected datasets:

- The checked-in cache contains 471 records across eight providers.
- The live Supabase table contains 2,674 records across seven providers.
- Only 244 records match by company and URL.
- The combined corpus contains 2,901 distinct records across twelve providers.

These numbers are an audit snapshot, not migration constants. The migration
must recalculate counts immediately before export and after each import step.

The static cache generates article routes, stories, digests, RSS, JSON, model
pages, and the sitemap. The hydrated homepage can also display Supabase-only
records. A live-only item can therefore appear in the feed without having a
permanent route or appearing in the site's other public surfaces.

The production Supabase project currently reports an unhealthy status and has
no recorded migrations, scheduled backups, repository connection, or project
branches. The repository has no `supabase/` directory, database baseline, seed,
or migration history.

## Goals

- Establish one canonical content lifecycle for database reads, static builds,
  permanent routes, feeds, and digests.
- Preserve every reachable historical article route and source URL.
- Make database structure and permissions reproducible from versioned files.
- Add Z.AI and Moonshot AI/Kimi through verified official sources.
- Establish the same admission path for harnesses, including the specific
  Hermes and OpenClaw projects after their canonical identities and official
  release channels are verified.
- Make source freshness and ingestion failures observable.
- Provide backend primitives for entity pages, events, Major Updates, local
  watchlists, and filtered feeds without requiring accounts.
- Keep the current site usable throughout migration.

## Non-Goals for Foundation

- Accounts, profiles, or server-side personalization.
- Email delivery or paid notification vendors.
- Paid LLM summarization, embeddings, or reranking.
- A visual redesign or replacement brand system.
- Automatically publishing third-party articles as canonical records.
- Fuzzy or model-generated event clustering.
- Generic policy, finance, rumor, tutorial, or business-news coverage that is
  not directly attached to a tracked entity or release.
- Destructive removal of the legacy table or checked-in cache.

## System Boundaries

### 1. Source registry

The checked-in source manifest is the reviewable configuration authority. A
sync command upserts it into Supabase so operational state can be recorded
without making dashboard edits the hidden source of truth.

Each source declares:

- stable identifier and display name;
- owning entity;
- official URL and feed or endpoint URL;
- transport type: RSS, Atom, JSON API, GitHub releases, sitemap, or bounded HTML;
- source role: newsroom, changelog, research, model cards, documentation, or
  releases;
- refresh interval and active state;
- parser identifier;
- admission evidence and date verified.

Operational fields such as last success, ETag, last-modified value, consecutive
failure count, and most recent item are stored in the database. Detailed error
messages remain private.

### 2. Ingestion pipeline

A scheduled GitHub workflow runs a Bun ingestion command. It loads the manifest,
fetches sources with conditional requests, parses into a shared normalized
shape, validates the result, and upserts through a Supabase service-role secret.
The service-role credential never enters client bundles or the repository.

One source failure cannot corrupt or erase records from successful sources. A
run records per-source results and exits nonzero when required sources fail.
Partial success is explicit in the run record and workflow summary.

After successful database ingestion, an export command materializes the public
cache from the canonical read model. Static routes and the hydrated application
therefore receive the same records. The export is deterministic and sorted by
`published_at DESC, id DESC`.

### 3. Canonical content model

The Foundation schema uses the following tables and responsibilities.

#### `entities`

Represents a stable subject that can own sources or appear in content.

Required fields:

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `entity_type` constrained to `lab`, `provider`, `model`, `harness`,
  `research_org`, or `product`
- `status` constrained to `active`, `watchlist`, or `archived`
- `homepage_url text`
- `summary text`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

#### `entity_relationships`

Connects models, products, harnesses, and organizations without hardcoding a
single hierarchy.

Required fields:

- `parent_entity_id uuid`
- `child_entity_id uuid`
- `relationship_type` constrained to `develops`, `publishes`, `maintains`,
  `owns`, `integrates`, or `successor_of`
- composite primary key across parent, child, and relationship type
- check preventing self-relationships

#### `sources`

Stores the synced source manifest and public health summary.

Required fields:

- `id uuid primary key`
- `source_key text unique not null`
- `entity_id uuid not null`
- `name text not null`
- `official_url text not null`
- `endpoint_url text not null`
- `transport_type` constrained to the supported parser transports
- `source_role` constrained to the approved first-party roles
- `parser_key text not null`
- `active boolean not null default true`
- `verified_at timestamptz not null`
- `last_success_at timestamptz`
- `last_item_at timestamptz`
- `consecutive_failures integer not null default 0`
- conditional request metadata
- created and updated timestamps

#### `content_items`

Stores immutable normalized source records. Ingestion may enrich a record when
its source changes, but must not replace its identity, original publication
time, canonical source URL, or legacy route mapping.

Required fields:

- `id uuid primary key`
- `legacy_id text unique`
- `source_id uuid not null`
- `external_id text`
- `canonical_url text unique not null`
- `title text not null`
- `excerpt text`
- `content text`
- `item_type` constrained to `announcement`, `model_release`, `api_change`,
  `deprecation`, `research`, `benchmark`, `security`, `harness_release`,
  `documentation`, or `other`
- `published_at timestamptz not null`
- `source_updated_at timestamptz`
- `first_seen_at timestamptz not null`
- `last_seen_at timestamptz not null`
- `content_hash text not null`
- `metadata jsonb not null default '{}'`

Uniqueness is enforced by normalized canonical URL and, when present, by
`(source_id, external_id)`. Upsert conflicts update only mutable enrichment
fields and `last_seen_at`.

#### `content_item_entities`

Relates an item to one or more entities with an explicit role: publisher,
subject, model, harness, or mentioned.

#### `events`

Represents an evolving change rather than a single article.

Required fields:

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `event_type` using the same controlled vocabulary as content items
- `significance` constrained to `routine`, `notable`, or `major`
- `occurred_at timestamptz not null`
- `anchor_item_id uuid not null`
- `status` constrained to `active`, `resolved`, or `superseded`
- deterministic `what_changed text`
- created and updated timestamps

Major Updates includes only events explicitly classified as `major`. The
classification reason is stored and returned publicly.

#### `event_items` and `event_entities`

Connect events to source records and entities. `event_items.role` is constrained
to `anchor`, `official_update`, or `supporting`. Foundation permits only exact,
deterministic clustering based on canonical identifiers, explicit release
versions, and configured relations. Ambiguous matches remain unclustered.

#### `route_aliases`

Maps every legacy article identifier and any renamed slug to its permanent
destination. Existing paths are never removed. Redirect exports are generated
from this table.

#### Private operational tables

`private.ingestion_runs` and `private.ingestion_source_runs` store timestamps,
counts, status, response metadata, and sanitized error details. They are not
available through the anonymous Data API.

### 4. Public read contract

The browser never queries private operational tables and never receives a
service credential. Anonymous users receive read access only to an explicit set
of public projections for entities, source health summaries, content, events,
and aliases. All base tables have RLS enabled. Anonymous and authenticated roles
receive no insert, update, delete, truncate, or sequence privileges.

The migration must verify the deployed Postgres and PostgREST versions before
choosing the view implementation. Public projections use security-invoker views
when the deployed version supports them. If not, narrowly scoped stable SQL
functions with a fixed search path expose the same typed contract. There is no
security-definer view over unrestricted tables.

The feed contract uses keyset pagination with the tuple
`(published_at, id)`, not offsets. Supported filters are entity slug, entity
type, item type, event significance, and date range. Text search uses a stored
Postgres `tsvector` generated from title, excerpt, and normalized entity names,
with a GIN index.

The compatibility adapter keeps the current article shape available while the
frontend is migrated. It must represent Supabase unavailability as degraded
state when the static cache is serving fallback data.

### 5. Indexes and constraints

Foundation creates and verifies at least these indexes:

- `content_items (published_at DESC, id DESC)`
- `content_items (source_id, published_at DESC, id DESC)`
- unique partial index on `(source_id, external_id)` when `external_id` is not
  null
- GIN index on the stored search vector
- `content_item_entities (entity_id, content_item_id)`
- `events (significance, occurred_at DESC, id DESC)`
- `event_items (event_id, role, content_item_id)`
- `event_entities (entity_id, event_id)`
- `sources (active, last_success_at)`

Foreign keys use explicit delete behavior. Canonical records use `RESTRICT` or
`NO ACTION`; ephemeral operational records may use `CASCADE`. Check constraints
enforce controlled vocabularies, nonempty titles and URLs, positive page limits,
and valid event anchors.

## Provider and Harness Expansion

The initial source-discovery pass covers:

- every provider present in either current dataset;
- Z.AI;
- Moonshot AI and Kimi;
- additional current labs or providers that satisfy the approved admission
  policy at discovery time;
- the exact Hermes and OpenClaw projects intended by the user, after canonical
  identity verification;
- other actively maintained harnesses that satisfy the same policy.

Each addition requires first-party evidence, a stable entity slug, at least one
tested source adapter, and a freshness test. Projects are not added solely from
search results, social accounts, or third-party directories.

## Migration and Rollout

### Gate 0: establish authenticated authority

- Confirm the current Supabase project and organization in the authenticated
  dashboard.
- Record the deployed Postgres version, exposed schemas, RLS policies, grants,
  functions, indexes, extensions, scheduled jobs, and advisor results.
- Obtain a supported local CLI login or connection string without exposing
  credentials in command output, history, source files, or chat.

### Gate 1: recoverable baseline

- Create a timestamped logical schema and data export before mutation.
- Record hashes, row counts, and table counts in a local migration receipt.
- Add `supabase/config.toml`, a schema baseline, and versioned migrations to the
  repository.
- Reproduce the schema in a local Supabase stack or isolated temporary database.

If a complete export cannot be produced, production mutation stops.

### Gate 2: additive schema

- Apply Foundation tables, constraints, indexes, RLS, and public read contracts
  without altering or dropping the legacy table.
- Run permission tests as anonymous, authenticated, and service roles.
- Apply live indexes using concurrency-safe procedures appropriate to the
  verified Postgres environment.

### Gate 3: lossless backfill

- Export the live legacy records and checked-in cache.
- Normalize both through the same ingestion code.
- Upsert the union into `content_items` and write legacy aliases.
- Compare source counts, distinct URLs, minimum and maximum publication dates,
  null rates, duplicate keys, and route coverage.
- Require zero unexplained record loss and zero broken existing article routes.

### Gate 4: dual-read verification

- Generate the static cache from the new canonical read contract.
- Run the current application against the generated cache and compatibility
  adapter.
- Compare old and new latest feeds, provider filters, article pages, digests,
  RSS, JSON, models, stories, and sitemap output.
- Keep the legacy table and current fallback cache intact.

### Gate 5: reversible cutover

- Switch application reads to the versioned contract.
- Preserve a single configuration rollback to the old read path.
- Observe ingestion, API error rate, source freshness, route errors, and build
  health for at least one complete scheduled refresh.
- Treat cleanup as a separate future change. Foundation does not drop data.

## Error Handling and Observability

- Fetches use bounded timeouts, retry only safe transient failures, and honor
  conditional response headers.
- Parser errors identify the source and adapter without leaking credentials or
  full sensitive response bodies.
- A stale source is visible after two expected refresh windows.
- The application shows a degraded-data notice when Supabase fails and the
  static cache is used.
- Scheduled workflow summaries list successes, failures, inserted rows, updated
  rows, and unchanged rows.
- Required-source failure produces a failing workflow status. Optional watchlist
  source failure produces a visible partial-success status.
- Cleanup jobs are not part of ingestion and may not delete canonical content.

## Testing Strategy

Foundation follows test-driven implementation.

1. Separate Bun unit tests from Playwright so `bun test` cannot collect browser
   specs.
2. Unit-test URL normalization, source parsing, validation, deduplication,
   immutable-field preservation, deterministic classification, and export
   ordering.
3. Contract-test every adapter with checked-in minimal fixtures. Tests must not
   depend on live provider availability.
4. Migration-test schema creation, constraints, indexes, compatibility reads,
   keyset pagination, full-text search, and rollback in an isolated database.
5. Permission-test anonymous reads and rejected anonymous writes for every
   exposed object.
6. Regression-test historical route preservation and the exact failure mode
   where refreshes previously removed old article routes.
7. Run lint, Astro check, build, unit tests, Playwright desktop and mobile flows,
   dependency audit, and rendered-browser checks before any cutover.

## Success Criteria

Foundation is complete only when all of the following are true:

- The repository can recreate the intended database schema from versioned
  files.
- A verified pre-migration export exists with hashes and row-count receipts.
- The migrated corpus equals the normalized union of live and static records,
  except for explicitly documented invalid duplicates.
- Every existing public article path still resolves or permanently redirects.
- Static routes and live reads originate from the same canonical contract.
- Anonymous users can read only the intended public projections and cannot
  mutate data or execute privileged functions.
- Feed pagination cannot skip or duplicate records when new rows arrive.
- Source failures are observable and cannot delete historical records.
- The provider discovery workflow can add Z.AI and Moonshot AI/Kimi without
  special-case architecture.
- The same registry can represent verified harness sources.
- The current application passes lint, type checks, builds, unit tests, and its
  rendered desktop and mobile critical flows.

## Risks and Mitigations

### Production is currently unhealthy

No mutation occurs before the health cause is identified and a complete export
is verified.

### Free-tier limits

Store normalized text rather than unnecessary raw payloads, use conditional
fetches, page with indexes, avoid paid AI services, and monitor database size and
request volume. If limits become binding, preserve the same public contract and
move archival exports to checked-in compressed artifacts or another free static
store through a separately approved design.

### Source instability

Adapters are isolated, fixture-tested, and backed by source health records.
Failure is contained to one source.

### Incorrect event clustering

Foundation clusters only exact, explainable matches. Ambiguous records stay
independent. Later automation requires a separate specification.

### Historical route loss

Legacy IDs and aliases are imported before cutover, exported into route tests,
and protected by a zero-loss migration gate.

### Hidden dashboard state

The authenticated audit records actual grants, RLS, functions, indexes,
extensions, and schedules before migrations are authored. Dashboard appearance
alone is not treated as proof.

## Rollback Contract

Rollback never restores from memory or reconstructs deleted rows. The legacy
table and original cache remain unchanged during Foundation. Application reads
can return to the old contract through one configuration switch. New tables are
left in place but receive no scheduled writes until the failure is diagnosed.
Any data written after cutover remains exportable and is not discarded.
