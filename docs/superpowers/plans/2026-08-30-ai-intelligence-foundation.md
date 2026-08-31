# AI Intelligence Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split static and Supabase feed lifecycle with a reproducible, lossless, free-tier intelligence backend while preserving every existing route and keeping the current application usable.

**Architecture:** A checked-in source manifest drives isolated Bun adapters, service-role ingestion, and deterministic cache export. Versioned Supabase migrations add normalized entities, sources, immutable content items, conservative event primitives, private run receipts, RLS, and versioned public projections beside the legacy table. The frontend moves through a compatibility adapter so degraded fallback, keyset pagination, and permanent-route behavior can be verified before cutover.

**Tech Stack:** Astro 7, React 19, Bun 1.4, TypeScript 6, PostgreSQL and Supabase Data API, GitHub Actions, Cloudflare Pages, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-ai-intelligence-index-design.md`

## Global Constraints

- The complete core product is free to readers.
- No paid AI API or hosted model is required.
- Use Bun for package installation, scripts, and tests.
- Do not add a production dependency without explicit approval.
- Production mutation stops unless a complete pre-migration export and hash receipt exist.
- Schema changes are additive. Do not drop, truncate, or rewrite the legacy table.
- Every existing article ID and route must remain resolvable.
- Anonymous roles receive read-only access to the explicit public contract and no write privileges.
- Source failures cannot delete previously imported records.
- Commit, push, deploy, and pull-request operations remain manual because the repository instructions require explicit authorization.
- Use test-driven steps and run lint, Astro check, relevant tests, build, and rendered browser verification.

---

## File Structure

### Product and database

- `supabase/config.toml`: local Supabase project configuration.
- `supabase/migrations/20260830000100_intelligence_foundation.sql`: schemas, enums, tables, constraints, indexes, triggers, RLS, grants, and read projections.
- `supabase/migrations/20260830000200_legacy_compatibility.sql`: compatibility projection and lossless legacy import function.
- `supabase/tests/intelligence_foundation.test.sql`: pgTAP schema, RLS, grant, index, and pagination checks.
- `supabase/seed.sql`: deterministic source and entity seeds generated from the manifest for local verification only.

### Source and ingestion runtime

- `config/intelligence-sources.mjs`: checked-in entity and source manifest.
- `scripts/intelligence/validate-manifest.mjs`: admission and uniqueness validation.
- `scripts/intelligence/normalize.mjs`: URL, text, date, ID, and immutable-record normalization.
- `scripts/intelligence/parse-feed.mjs`: RSS and Atom parsing extracted from the current gatherer.
- `scripts/intelligence/parse-sitemap.mjs`: bounded official sitemap discovery and page metadata parsing.
- `scripts/intelligence/fetch-source.mjs`: conditional fetches, timeouts, and isolated adapter dispatch.
- `scripts/intelligence/supabase-rest.mjs`: service-role REST client with bounded batching and redacted errors.
- `scripts/intelligence/ingest.mjs`: source run orchestration and canonical upserts.
- `scripts/intelligence/export-cache.mjs`: keyset-paginated export to the legacy `Article[]` JSON shape.
- `scripts/intelligence/backfill.mjs`: lossless live-plus-static normalization and migration receipt generation.
- `scripts/intelligence/receipt.mjs`: counts and SHA-256 hashes without credential output.
- `scripts/intelligence/*.test.mjs`: unit and contract tests with local fixtures.
- `scripts/intelligence/fixtures/`: minimal RSS, Atom, sitemap, page, and malformed-source fixtures.

### Application compatibility

- `src/types/intelligence.ts`: versioned feed, entity, event, cursor, and degraded-state types.
- `src/lib/intelligenceClient.ts`: anonymous read contract and keyset query builder.
- `src/lib/articleCompatibility.ts`: lossless conversion from feed items to the existing `Article` shape.
- `src/hooks/fetchArticlesPage.ts`: replace offset and 200-row merge logic with the compatibility client.
- `src/components/ArticleListIsland.tsx`: render a visible stale-cache notice.
- `src/components/ArticlesIslandWrapper.tsx`: pass initial data state through hydration.
- `src/pages/index.astro`: mark the SSR seed as canonical-cache data with freshness metadata.

### Automation and tests

- `package.json`: separate unit, database, integration, and Playwright commands.
- `playwright.config.ts`: recognize only Playwright-named browser files.
- `tests/e2e/site.spec.ts` to `tests/e2e/site.e2e.ts`: keep browser tests out of Bun collection.
- `.github/workflows/refresh-feeds.yml`: fail visibly on required source errors, ingest, export, verify, then update the cache.
- `.github/workflows/verify.yml`: lint, check, unit, database, build, and Playwright gates without production credentials.
- `docs/operations/source-admission.md`: exact admission and verification procedure.
- `docs/operations/supabase-migration-runbook.md`: backup, apply, validate, cutover, and rollback commands.
- `docs/operations/receipts/`: ignored local migration receipts with a tracked README explaining the format.

---

### Task 1: Separate Unit and Browser Test Runners

**Files:**

- Modify: `package.json`
- Modify: `playwright.config.ts`
- Move: `tests/e2e/site.spec.ts` to `tests/e2e/site.e2e.ts`
- Test: `scripts/gather-provider-feeds.test.mjs`

**Interfaces:**

- Consumes: the existing Bun unit test and Playwright configuration.
- Produces: `bun test` for unit tests and `bun run test:e2e` for browser tests, with no cross-collection.

- [ ] **Step 1: Capture the failing baseline**

Run:

```bash
bun test
```

Expected: failure because Bun collects `tests/e2e/site.spec.ts` and Playwright rejects `test.beforeEach()` outside the Playwright runner.

- [ ] **Step 2: Add an explicit Playwright filename contract**

Set this in `playwright.config.ts`:

```ts
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  // Preserve the existing webServer, projects, retries, and reporter settings.
});
```

Move `site.spec.ts` to `site.e2e.ts` and add these package scripts without removing existing scripts:

```json
{
  "test": "bun test",
  "test:unit": "bun test",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 3: Verify runner isolation**

Run:

```bash
bun test
bun run test:e2e
```

Expected: two Bun tests pass; Playwright retains its existing six passing and two skipped project cases with no Bun runner error.

- [ ] **Step 4: Record a manual checkpoint**

Run `git diff --check` and `git status --short`. Do not commit.

---

### Task 2: Define and Test Canonical Normalization

**Files:**

- Create: `scripts/intelligence/normalize.mjs`
- Create: `scripts/intelligence/normalize.test.mjs`
- Create: `scripts/intelligence/fixtures/legacy-items.json`
- Modify: `scripts/merge-provider-articles.mjs`
- Test: `scripts/gather-provider-feeds.test.mjs`

**Interfaces:**

- Produces:
  - `normalizeUrl(value: string): string`
  - `stableItemId(sourceKey: string, canonicalUrl: string): string`
  - `normalizeItem(input: RawSourceItem, source: SourceDefinition): CanonicalItem`
  - `mergeCanonicalItems(fresh: CanonicalItem[], existing: CanonicalItem[]): CanonicalItem[]`
  - `toLegacyArticle(item: CanonicalItem): Article`
- Immutable fields: `id`, `legacy_id`, `source_key`, `canonical_url`, `published_at`, and `first_seen_at`.

- [ ] **Step 1: Write failing normalization tests**

Cover tracking-parameter removal, fragment removal, hostname normalization, invalid protocols, stable IDs, invalid dates, immutable-field preservation, and newest-first ID tie-breaking:

```js
test('preserves immutable identity when a source refreshes metadata', () => {
  const merged = mergeCanonicalItems([refreshed], [historical]);
  expect(merged[0].id).toBe(historical.id);
  expect(merged[0].published_at).toBe(historical.published_at);
  expect(merged[0].title).toBe(refreshed.title);
});

test('orders equal timestamps by stable id descending', () => {
  const merged = mergeCanonicalItems([itemA, itemB], []);
  expect(merged.map(({ id }) => id)).toEqual(['provider-b', 'provider-a']);
});
```

- [ ] **Step 2: Verify the tests fail**

Run `bun test scripts/intelligence/normalize.test.mjs`.

Expected: failure because the module and exports do not exist.

- [ ] **Step 3: Implement the minimal canonical normalizer**

Use SHA-256 IDs, remove only known tracking parameters, require HTTP or HTTPS, require valid ISO timestamps, and use a tuple comparator:

```js
export function compareCanonicalItems(a, b) {
  const dateOrder = Date.parse(b.published_at) - Date.parse(a.published_at);
  return dateOrder || b.id.localeCompare(a.id);
}
```

Adapt `mergeProviderArticles` through the same preservation behavior rather than maintaining a second merge policy.

- [ ] **Step 4: Verify unit and historical-route regressions**

Run:

```bash
bun test scripts/intelligence/normalize.test.mjs scripts/gather-provider-feeds.test.mjs
```

Expected: all tests pass and the cached-history regression remains green.

---

### Task 3: Create the Curated Entity and Source Manifest

**Files:**

- Create: `config/intelligence-sources.mjs`
- Create: `scripts/intelligence/validate-manifest.mjs`
- Create: `scripts/intelligence/validate-manifest.test.mjs`
- Create: `docs/operations/source-admission.md`
- Modify: `src/lib/companyCatalog.ts`
- Retire after migration: `src/lib/providerSources.ts`

**Interfaces:**

- Produces:
  - `entities: EntityDefinition[]`
  - `sources: SourceDefinition[]`
  - `validateManifest({ entities, sources }): ValidationResult`
  - `entityBySlug(slug: string): EntityDefinition | undefined`
- `SourceDefinition` includes `sourceKey`, `entitySlug`, `officialUrl`, `endpointUrl`, `transportType`, `sourceRole`, `parserKey`, `required`, and `verifiedAt`.

- [ ] **Step 1: Write failing manifest contract tests**

Require unique slugs and source keys, HTTPS endpoints, valid owner entities, official-source evidence, and explicit required/watchlist status:

```js
test('rejects sources whose entity is missing', () => {
  const result = validateManifest({ entities: [], sources: [orphanSource] });
  expect(result.errors).toContain('source openclaw-releases references missing entity openclaw');
});
```

- [ ] **Step 2: Verify the tests fail**

Run `bun test scripts/intelligence/validate-manifest.test.mjs`.

- [ ] **Step 3: Add the initial manifest**

Include every entity present in the union of the current cache and live table.
Add verified first-party definitions for Z.AI and Moonshot AI/Kimi. Add Hermes
Agent from the Nous Research repository and OpenClaw from the OpenClaw
repository as harness entities. Use their official release channels:

```js
{
  sourceKey: 'hermes-agent-releases',
  entitySlug: 'hermes-agent',
  officialUrl: 'https://github.com/NousResearch/hermes-agent',
  endpointUrl: 'https://github.com/NousResearch/hermes-agent/releases.atom',
  transportType: 'atom',
  sourceRole: 'releases',
  parserKey: 'atom',
  required: false,
  verifiedAt: '2026-08-30',
}
```

```js
{
  sourceKey: 'openclaw-releases',
  entitySlug: 'openclaw',
  officialUrl: 'https://github.com/openclaw/openclaw',
  endpointUrl: 'https://github.com/openclaw/openclaw/releases.atom',
  transportType: 'atom',
  sourceRole: 'releases',
  parserKey: 'atom',
  required: false,
  verifiedAt: '2026-08-30',
}
```

Use Z.AI's official release-notes or blog sitemap and Moonshot AI's official
GitHub release channels only after live HTTP verification. Record every verified
URL and evidence date in `source-admission.md`.

- [ ] **Step 4: Add a deterministic discovery audit**

Run HEAD or bounded GET checks for each endpoint, reject redirects outside the
declared official domain unless explicitly allowlisted, and require at least one
valid fixture-equivalent item from active sources.

- [ ] **Step 5: Verify the manifest**

Run:

```bash
bun run scripts/intelligence/validate-manifest.mjs
bun test scripts/intelligence/validate-manifest.test.mjs
```

Expected: zero manifest errors and a source-by-source verification summary.

---

### Task 4: Extract Isolated Feed and Sitemap Adapters

**Files:**

- Create: `scripts/intelligence/parse-feed.mjs`
- Create: `scripts/intelligence/parse-sitemap.mjs`
- Create: `scripts/intelligence/fetch-source.mjs`
- Create: `scripts/intelligence/parse-feed.test.mjs`
- Create: `scripts/intelligence/parse-sitemap.test.mjs`
- Create: `scripts/intelligence/fetch-source.test.mjs`
- Create: `scripts/intelligence/fixtures/rss.xml`
- Create: `scripts/intelligence/fixtures/atom.xml`
- Create: `scripts/intelligence/fixtures/sitemap.xml`
- Create: `scripts/intelligence/fixtures/release-page.html`
- Modify: `scripts/gather-provider-feeds.mjs`

**Interfaces:**

- Produces:
  - `parseRss(source, xml): RawSourceItem[]`
  - `parseAtom(source, xml): RawSourceItem[]`
  - `parseSitemap(source, xml): DiscoveredPage[]`
  - `parsePageMetadata(source, html, url): RawSourceItem`
  - `fetchSource(source, { fetchImpl, previousState, now }): SourceFetchResult`
- `SourceFetchResult` includes `status`, `items`, `etag`, `lastModified`, `httpStatus`, `fetchedAt`, and a sanitized error.

- [ ] **Step 1: Write adapter fixture tests**

Test CDATA, encoded entities, alternate Atom links, unsafe protocols, invalid
dates, conditional `304`, timeout, `429`, redirects, zero-item success, and
sitemap domain filtering.

- [ ] **Step 2: Verify tests fail**

Run `bun test scripts/intelligence/parse-feed.test.mjs scripts/intelligence/parse-sitemap.test.mjs scripts/intelligence/fetch-source.test.mjs`.

- [ ] **Step 3: Extract the current parser and add bounded sitemap support**

Reuse existing parsing behavior but make all network access injectable. Use
`AbortSignal.timeout(10_000)`, conditional headers, and a fixed user agent. The
sitemap adapter may fetch at most 25 new or changed pages per run and may follow
only declared official hostnames.

- [ ] **Step 4: Treat empty required feeds as failure**

Return `status: 'failed'` for HTTP 200 with zero parsed items. Never replace a
nonempty historical set with an empty result.

- [ ] **Step 5: Verify adapters and existing gather behavior**

Run all adapter tests plus `bun test scripts/gather-provider-feeds.test.mjs`.

---

### Task 5: Add the Versioned Supabase Foundation

**Files:**

- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260830000100_intelligence_foundation.sql`
- Create: `supabase/migrations/20260830000200_legacy_compatibility.sql`
- Create: `supabase/tests/intelligence_foundation.test.sql`
- Create: `supabase/seed.sql`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**

- Produces public relations: `entities`, `entity_relationships`, `sources`,
  `content_items`, `content_item_entities`, `events`, `event_items`,
  `event_entities`, and `route_aliases`.
- Produces private relations: `private.ingestion_runs` and
  `private.ingestion_source_runs`.
- Produces versioned read contracts: `public.intelligence_feed_v1`,
  `public.intelligence_entities_v1`, `public.intelligence_events_v1`, and
  `public.intelligence_source_health_v1`.

- [ ] **Step 1: Add the Supabase CLI as a development dependency**

Run:

```bash
bun add --dev supabase
```

This is development tooling, not a production dependency.

- [ ] **Step 2: Initialize local configuration and write a failing pgTAP contract**

The first assertions require the normalized tables and confirm anonymous roles
cannot insert:

```sql
select has_table('public', 'content_items');
select has_table('private', 'ingestion_runs');
select has_index('public', 'content_items', 'content_items_published_cursor_idx');
set local role anon;
select throws_ok(
  $$insert into public.content_items (id) values (gen_random_uuid())$$,
  '42501'
);
reset role;
```

- [ ] **Step 3: Start an isolated database and verify the contract fails**

Run:

```bash
bunx supabase start
bunx supabase test db
```

Expected: pgTAP fails because the Foundation relations do not exist.

- [ ] **Step 4: Implement the additive schema**

Use the exact enums, fields, constraints, and indexes in the approved spec. Add
an `updated_at` trigger with a fixed search path. Enable RLS on every public base
table. Grant anonymous and authenticated roles SELECT only on explicit public
projections, with zero mutation or sequence privileges.

The canonical cursor index must be:

```sql
create index content_items_published_cursor_idx
  on public.content_items (published_at desc, id desc);
```

The search vector must be stored and indexed:

```sql
alter table public.content_items
  add column search_document tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored;
create index content_items_search_idx
  on public.content_items using gin (search_document);
```

- [ ] **Step 5: Add the compatibility projection**

Return the existing `Article` fields and new cursor metadata without changing or
dropping `ai_company_news`. Ensure view or RPC security matches the Postgres and
PostgREST versions verified during Gate 0.

- [ ] **Step 6: Verify local migrations and reset reproducibility**

Run:

```bash
bunx supabase db reset
bunx supabase test db
bunx supabase db lint --level warning
```

Expected: all pgTAP assertions pass and lint reports no unaddressed warnings.

---

### Task 6: Implement Service-Role Ingestion and Run Receipts

**Files:**

- Create: `scripts/intelligence/supabase-rest.mjs`
- Create: `scripts/intelligence/supabase-rest.test.mjs`
- Create: `scripts/intelligence/ingest.mjs`
- Create: `scripts/intelligence/ingest.test.mjs`
- Create: `scripts/intelligence/receipt.mjs`
- Create: `scripts/intelligence/receipt.test.mjs`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**

- Produces:
  - `createAdminClient({ url, serviceRoleKey, fetchImpl })`
  - `upsertRows(table, rows, { onConflict, batchSize }): Promise<void>`
  - `runIngestion({ manifest, client, fetchImpl, now }): IngestionReceipt`
  - `writeReceipt(receipt, path): Promise<{ sha256: string }>`
- Required environment variables are server-only `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`. Existing `PUBLIC_*` values remain browser reads.

- [ ] **Step 1: Write failing redaction and partial-failure tests**

```js
test('never includes the service role key in thrown errors', async () => {
  const client = createAdminClient({ url, serviceRoleKey: secret, fetchImpl: failingFetch });
  await expect(client.select('content_items')).rejects.not.toThrow(secret);
});

test('records partial failure without deleting history', async () => {
  const receipt = await runIngestion({ manifest, client: fakeClient, fetchImpl, now });
  expect(receipt.status).toBe('partial');
  expect(fakeClient.deletes).toEqual([]);
});
```

- [ ] **Step 2: Verify the tests fail**

Run `bun test scripts/intelligence/supabase-rest.test.mjs scripts/intelligence/ingest.test.mjs scripts/intelligence/receipt.test.mjs`.

- [ ] **Step 3: Implement bounded REST writes**

Use batches of at most 250 rows, `Prefer: resolution=merge-duplicates`, explicit
`on_conflict`, timeouts, and sanitized response messages. Reject browser-prefixed
service credentials.

- [ ] **Step 4: Implement source-run orchestration**

Start one ingestion receipt, fetch each source independently, upsert fresh items,
update public health summaries, and finish with `success`, `partial`, or `failed`.
Never issue a delete from the ingestion path.

- [ ] **Step 5: Add scripts**

```json
{
  "sources:validate": "bun scripts/intelligence/validate-manifest.mjs",
  "ingest": "bun scripts/intelligence/ingest.mjs",
  "test:db": "supabase test db"
}
```

- [ ] **Step 6: Verify unit and local integration behavior**

Run the three unit files, then run ingestion against the local Supabase stack
with a bounded fixture manifest. Confirm the receipt contains counts and hashes
but no credentials.

---

### Task 7: Build Lossless Backfill, Cache Export, and Alias Verification

**Files:**

- Create: `scripts/intelligence/backfill.mjs`
- Create: `scripts/intelligence/backfill.test.mjs`
- Create: `scripts/intelligence/export-cache.mjs`
- Create: `scripts/intelligence/export-cache.test.mjs`
- Create: `docs/operations/receipts/README.md`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**

- Produces:
  - `buildBackfill({ legacyRows, cacheRows, sourceMap, now }): BackfillBundle`
  - `verifyBackfill(before, after): VerificationResult`
  - `exportLegacyArticles({ client, pageSize }): AsyncGenerator<Article[]>`
  - `verifyRouteAliases(previousArticles, aliases): VerificationResult`
- Receipt fields include source counts, distinct canonical URLs, null counts,
  duplicate counts, date range, output SHA-256, and unexplained-loss count.

- [ ] **Step 1: Write failing union and route-preservation tests**

Use fixtures containing a live-only row, cache-only row, exact duplicate, legacy
ID collision, malformed URL, and equal timestamp. Require every valid distinct
URL and all prior article IDs in the result.

- [ ] **Step 2: Verify the tests fail**

Run `bun test scripts/intelligence/backfill.test.mjs scripts/intelligence/export-cache.test.mjs`.

- [ ] **Step 3: Implement deterministic backfill**

Normalize both inputs through Task 2, prefer existing stable legacy IDs, emit a
route alias for every previous ID, quarantine invalid rows in the receipt, and
fail when `unexplainedLossCount > 0`.

- [ ] **Step 4: Implement keyset export**

Query `(published_at,id)` pages until no `next_cursor` remains. Write to a
temporary file, fsync and verify JSON, then atomically replace
`public/data/provider-articles.json` only when the output is nonempty and route
coverage passes.

- [ ] **Step 5: Verify repeated export stability**

Two exports from unchanged local data must produce byte-identical files and the
same SHA-256.

- [ ] **Step 6: Add operational scripts**

```json
{
  "db:backfill": "bun scripts/intelligence/backfill.mjs",
  "cache:export": "bun scripts/intelligence/export-cache.mjs",
  "verify:routes": "bun scripts/intelligence/backfill.mjs --verify-only"
}
```

---

### Task 8: Replace Offset Reads with the Versioned Compatibility Client

**Files:**

- Create: `src/types/intelligence.ts`
- Create: `src/lib/intelligenceClient.ts`
- Create: `src/lib/intelligenceClient.test.ts`
- Create: `src/lib/articleCompatibility.ts`
- Create: `src/lib/articleCompatibility.test.ts`
- Modify: `src/hooks/fetchArticlesPage.ts`
- Modify: `src/types/article.ts`

**Interfaces:**

- Produces:
  - `FeedCursor = { publishedAt: string; id: string }`
  - `FeedPage = { data: FeedItem[]; nextCursor: FeedCursor | null; state: DataState }`
  - `DataState = 'live' | 'static' | 'degraded' | 'unconfigured'`
  - `fetchIntelligencePage(filters, cursor, dependencies): Promise<FeedPage>`
  - `toArticle(item: FeedItem): Article`
- Preserves `fetchArticlesPage(filters, pageParam)` temporarily through a typed
  cursor adapter until the React query hook is converted.

- [ ] **Step 1: Write failing query and fallback tests**

Test URL encoding, tuple cursor filters, entity and item filters, timeout,
Supabase `500`, invalid payload, fallback success, and explicit degraded state.

- [ ] **Step 2: Verify tests fail**

Run `bun test src/lib/intelligenceClient.test.ts src/lib/articleCompatibility.test.ts`.

- [ ] **Step 3: Implement the versioned client**

Do not fetch a fixed 200-row window. Request `PAGE_SIZE + 1` rows from the
versioned projection or RPC, derive the next cursor from the last returned row,
and fall back to the exported cache with `state: 'degraded'` on live failure.

- [ ] **Step 4: Adapt the current hook without changing visible behavior**

Keep existing company, topic, and query filtering functional. Preserve the
existing public `Article` shape while carrying `DataState` and cursor metadata.

- [ ] **Step 5: Verify type and unit contracts**

Run:

```bash
bun test src/lib/intelligenceClient.test.ts src/lib/articleCompatibility.test.ts
bun run check
```

Expected: unit tests pass and Astro reports zero errors, warnings, and hints.

---

### Task 9: Surface Degraded Data and Preserve Hydration

**Files:**

- Modify: `src/components/ArticleListIsland.tsx`
- Modify: `src/components/ArticlesIslandWrapper.tsx`
- Modify: `src/hooks/useArticles.ts`
- Modify: `src/pages/index.astro`
- Modify: `tests/e2e/site.e2e.ts`

**Interfaces:**

- Consumes: `DataState` from Task 8.
- Produces: an accessible status notice only when the live source is degraded,
  with the static cache still usable.

- [ ] **Step 1: Add a failing rendered-flow test**

Intercept the Supabase request with `503`, leave the cache request successful,
and require a `role="status"` notice containing the cache freshness date while
article links remain usable.

- [ ] **Step 2: Verify the browser test fails**

Run `bun run test:e2e --grep "degraded"`.

- [ ] **Step 3: Implement the smallest status treatment**

Preserve the incumbent editorial system. Use existing border, micro-label,
brand, focus, and spacing tokens. Do not add a new visual language. Copy:

```text
Live updates are temporarily unavailable. Showing the verified cache from {date}.
```

Use `role="status"`, do not steal focus, and keep the feed interactive.

- [ ] **Step 4: Verify desktop and mobile hydration**

Run the degraded test and the full Playwright suite. Confirm no horizontal
overflow and no console errors.

---

### Task 10: Make Feed Automation Truthful and Reproducible

**Files:**

- Modify: `.github/workflows/refresh-feeds.yml`
- Create: `.github/workflows/verify.yml`
- Modify: `package.json`
- Create: `docs/operations/supabase-migration-runbook.md`

**Interfaces:**

- Produces: a verification workflow with no production secrets and a scheduled
  ingestion workflow that reports required failures accurately.

- [ ] **Step 1: Add a workflow-shape unit test**

Create a Bun test that parses the two workflow files as text and rejects
`continue-on-error: true` on the ingestion step, requires least-privilege
permissions, and requires validation before cache commit.

- [ ] **Step 2: Verify the test fails**

Run the workflow-shape test.

- [ ] **Step 3: Replace silent partial success**

The refresh workflow must:

1. check out;
2. set up Bun 1.4.0;
3. install with `bun install --frozen-lockfile`;
4. validate the manifest;
5. ingest to Supabase using GitHub secrets;
6. export the canonical cache;
7. verify routes and nonempty output;
8. commit the cache only when changed;
9. fail the job when required sources or verification fail.

Optional source failures remain visible in the step summary and receipt but do
not block export of other valid sources.

- [ ] **Step 4: Add the non-production verification workflow**

Run lint, check, unit tests, local database tests, build, and Playwright. Use
least-privilege `contents: read` permissions and no production credentials.

- [ ] **Step 5: Write the exact migration runbook**

Include commands for authenticated inventory, export, hashes, local reset,
dry-run migration, additive apply, backfill, comparison, cutover, observation,
and rollback. Every destructive command is explicitly excluded.

- [ ] **Step 6: Verify workflows locally**

Run the workflow-shape test, lint, check, unit tests, and build.

---

### Task 11: Establish the Production Baseline and Recoverable Export

**Files:**

- Create locally and keep ignored: `docs/operations/receipts/<timestamp>-pre-migration/`
- Update after verified inspection: `docs/operations/supabase-migration-runbook.md`
- Update from actual schema: `supabase/migrations/20260830000000_legacy_baseline.sql`

**Interfaces:**

- Consumes: authenticated Supabase dashboard or CLI access to project
  `arejerdupcduqhgdoyht`.
- Produces: schema export, data export, object inventory, hashes, row-count
  receipt, and a reproducible legacy baseline with no secrets.

- [ ] **Step 1: Inspect authenticated production state read-only**

Record Postgres version, exposed schemas, tables, columns, constraints, indexes,
RLS status and policy bodies, grants, functions, extensions, scheduled jobs,
database size, and advisor findings. Save sanitized SQL results to the ignored
receipt directory.

- [ ] **Step 2: Export before mutation**

Use the authenticated CLI or a direct connection without echoing credentials:

```bash
bunx supabase db dump --linked --schema public,private --file "$receipt_dir/schema.sql"
bunx supabase db dump --linked --data-only --schema public --file "$receipt_dir/data.sql"
shasum -a 256 "$receipt_dir/schema.sql" "$receipt_dir/data.sql" > "$receipt_dir/SHA256SUMS"
```

If the `private` schema does not exist, export `public` and record that fact.

- [ ] **Step 3: Verify export integrity**

Restore the exports into an isolated local database, compare table and row
counts, and query the oldest and newest dates. Production mutation is forbidden
if restore or counts fail.

- [ ] **Step 4: Check in a sanitized legacy baseline**

Remove ownership, credentials, and data from the schema-only baseline. Confirm
it can recreate the legacy objects locally before Foundation migrations run.

- [ ] **Step 5: Record the gate result**

The receipt states `pass` only when both dumps exist, hashes verify, restore
succeeds, and counts match. Do not commit the receipt or secrets.

---

### Task 12: Apply, Backfill, Cut Over, and Verify Production

**Files:**

- Use: `supabase/migrations/*.sql`
- Use: `docs/operations/supabase-migration-runbook.md`
- Create locally and keep ignored: `docs/operations/receipts/<timestamp>-foundation-rollout/`

**Interfaces:**

- Produces: additive production schema, lossless canonical corpus, versioned
  read contract, exported cache, and verification receipt.

- [ ] **Step 1: Re-run the complete local gate**

Run:

```bash
bun install --frozen-lockfile
bun run lint
bun run check
bun test
bunx supabase db reset
bunx supabase test db
bun run build
bun run test:e2e
bun audit
```

Expected: every command exits zero.

- [ ] **Step 2: Preview the remote migration**

Run `bunx supabase db push --dry-run --linked` and inspect every statement. The
preview must contain no `DROP`, `TRUNCATE`, legacy-table rewrite, or broad grant.

- [ ] **Step 3: Apply only the additive migrations**

Run the versioned migration through the authenticated CLI. Capture the command
status and deployed migration list in the ignored rollout receipt.

- [ ] **Step 4: Run the lossless backfill**

Load the live legacy export and checked-in cache through the Task 7 normalizer,
upsert canonical rows, create aliases, and regenerate the cache. Require zero
unexplained loss and zero missing prior IDs.

- [ ] **Step 5: Verify role boundaries in production**

With the anonymous credential, prove public projections are readable and every
write attempt is rejected. With no credential, prove private relations are not
exposed. Do not print keys.

- [ ] **Step 6: Verify application contracts**

Build against the versioned read contract, run desktop and mobile Playwright,
check article routes sampled from oldest, middle, newest, live-only, and
cache-only records, and verify RSS, JSON, stories, models, digests, and sitemap.

- [ ] **Step 7: Perform the reversible cutover**

Switch local application configuration to the versioned contract. Do not push or
deploy without explicit authorization. Preserve the old read path as the single
rollback switch and leave the legacy table intact.

- [ ] **Step 8: Observe one scheduled-equivalent refresh**

Run ingestion and export once against production, verify source-run receipts,
then compare counts and route coverage again. Do not mark Foundation complete
until this full refresh passes.

- [ ] **Step 9: Run the completion audit**

Map every Foundation success criterion in the spec to current file, database,
command, rendered-browser, and receipt evidence. Any missing or indirect proof
keeps the task open.

---

## Plan Self-Review Checklist

- [ ] Every Foundation goal and non-goal in the specification maps to a task.
- [ ] Every new public interface is named before a later task consumes it.
- [ ] Unit, database, integration, and rendered-browser tests are separated.
- [ ] No step deletes legacy content or weakens the backup-first gate.
- [ ] No production secret appears in a command argument, file, receipt, or log.
- [ ] The plan contains no placeholder implementation steps.
- [ ] Production cutover remains reversible and deployment remains separately authorized.
