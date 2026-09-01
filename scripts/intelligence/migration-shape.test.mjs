import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FOUNDATION_URL = new URL(
  '../../supabase/migrations/20260830000100_intelligence_foundation.sql',
  import.meta.url,
);
const COMPATIBILITY_URL = new URL(
  '../../supabase/migrations/20260830000200_legacy_compatibility.sql',
  import.meta.url,
);
const ROUTE_SAFETY_URL = new URL(
  '../../supabase/migrations/20260901000100_safe_article_route_ids.sql',
  import.meta.url,
);

async function readMigrations() {
  const [foundation, compatibility, routeSafety] = await Promise.all([
    readFile(fileURLToPath(FOUNDATION_URL), 'utf8'),
    readFile(fileURLToPath(COMPATIBILITY_URL), 'utf8'),
    readFile(fileURLToPath(ROUTE_SAFETY_URL), 'utf8'),
  ]);
  return {
    foundation: foundation.toLowerCase(),
    compatibility: compatibility.toLowerCase(),
    routeSafety: routeSafety.toLowerCase(),
    combined: `${foundation}\n${compatibility}\n${routeSafety}`.toLowerCase(),
  };
}

describe('Supabase intelligence migrations', () => {
  test('remain additive and preserve the legacy table', async () => {
    const { combined } = await readMigrations();

    expect(combined).not.toMatch(/\bdrop\s+(table|schema|type|view|function)\b/);
    expect(combined).not.toMatch(/\btruncate\b/);
    expect(combined).not.toMatch(/\bdelete\s+from\s+(public\.)?ai_company_news\b/);
    expect(combined).not.toMatch(
      /\balter\s+table\s+(public\.)?ai_company_news\s+(drop|rename|alter\s+column)\b/,
    );
  });

  test('creates every normalized public and private relation', async () => {
    const { foundation } = await readMigrations();
    const publicTables = [
      'entities',
      'entity_relationships',
      'sources',
      'content_items',
      'content_item_entities',
      'events',
      'event_items',
      'event_entities',
      'route_aliases',
    ];

    for (const table of publicTables) {
      expect(foundation).toContain(`create table public.${table}`);
      expect(foundation).toContain(`alter table public.${table} enable row level security`);
    }

    expect(foundation).toContain('create schema if not exists private');
    expect(foundation).toContain('create table private.ingestion_runs');
    expect(foundation).toContain('create table private.ingestion_source_runs');
  });

  test('uses UUID identities and canonical pagination and search indexes', async () => {
    const { foundation } = await readMigrations();

    expect(foundation).toMatch(/create table public\.content_items\s*\([\s\S]*?id uuid primary key/);
    expect(foundation).toContain(
      'create index content_items_published_cursor_idx on public.content_items (published_at desc, id desc)',
    );
    expect(foundation).toContain(
      'create index content_items_search_idx on public.content_items using gin (search_document)',
    );
    expect(foundation).toContain(
      'create unique index content_items_source_external_key on public.content_items (source_id, external_id) where external_id is not null',
    );
    expect(foundation).toContain("allowed_hosts text[] not null check (cardinality(allowed_hosts) > 0)");
    expect(foundation).toContain("canonical_url text unique not null check (canonical_url ~ '^https://')");
    expect(foundation).toContain('create function private.enforce_content_item_source_host()');
    expect(foundation).toContain('create trigger content_items_enforce_source_host');
    expect(foundation).toContain("homepage_url !~ '^https://[^/?#]*@'");
    expect(foundation).toContain("official_url !~ '^https://[^/?#]*@'");
    expect(foundation).toContain("endpoint_url !~ '^https://[^/?#]*@'");
  });

  test('exposes only security-invoker read projections to browser roles', async () => {
    const { combined } = await readMigrations();
    const views = [
      'intelligence_feed_v1',
      'intelligence_entities_v1',
      'intelligence_events_v1',
      'intelligence_source_health_v1',
    ];

    for (const view of views) {
      expect(combined).toContain(`create view public.${view} with (security_invoker = true)`);
      expect(combined).toContain(`grant select on public.${view} to anon, authenticated`);
    }

    expect(combined).toContain('revoke all on all tables in schema public from anon, authenticated');
    expect(combined).toContain('revoke all on all sequences in schema public from anon, authenticated');
    const browserGrantStatements = combined
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.startsWith('grant '))
      .filter((statement) => /\bto\s+(anon|authenticated)\b/.test(statement));
    expect(browserGrantStatements.every((statement) => statement.startsWith('grant select '))).toBeTrue();
  });

  test('projects the admitted source provenance instead of a hard-coded type', async () => {
    const { foundation, compatibility } = await readMigrations();

    expect(foundation).toContain("coalesce(source.metadata ->> 'source_type', 'rss_official') as source_type");
    expect(compatibility).toContain(
      "coalesce(source.metadata ->> 'source_type', 'rss_official')::public.news_source_type as source_type",
    );
    expect(foundation).not.toContain("'rss_official'::text as source_type");
    expect(compatibility).not.toContain("'rss_official'::public.news_source_type as source_type");
  });

  test('constrains legacy IDs and destinations to safe article route segments', async () => {
    const { routeSafety } = await readMigrations();

    expect(routeSafety).toContain('content_items_legacy_id_safe');
    expect(routeSafety).toContain('route_aliases_legacy_id_safe');
    expect(routeSafety).toContain('route_aliases_destination_path_safe');
    expect(routeSafety).toContain("legacy_id !~ '^[a-za-z0-9._~-]+$'");
    expect(routeSafety).toContain("destination_path !~ '^/article/[a-za-z0-9._~-]+/?$'");
    expect(routeSafety).toContain("legacy_id in ('.', '..')");
  });

  test('keeps the raw legacy table private while exposing its admitted projection', async () => {
    const { compatibility } = await readMigrations();

    expect(compatibility).toContain(
      'revoke all on public.ai_company_news from anon, authenticated',
    );
    expect(compatibility).not.toContain(
      'grant select on public.ai_company_news to anon, authenticated',
    );
    expect(compatibility).toContain(
      'grant select on public.ai_company_news_v1 to anon, authenticated',
    );
  });

  test('keeps operational details private and grants service-role access explicitly', async () => {
    const { foundation } = await readMigrations();

    expect(foundation).toContain('revoke all on schema private from public, anon, authenticated');
    expect(foundation).toContain('grant usage on schema private to service_role');
    expect(foundation).toContain('grant all on all tables in schema private to service_role');
    const privateBrowserGrants = foundation
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.startsWith('grant '))
      .filter((statement) => /private\.(ingestion_runs|ingestion_source_runs)/.test(statement))
      .filter((statement) => /\bto\s+(anon|authenticated)\b/.test(statement));
    expect(privateBrowserGrants).toEqual([]);
  });

  test('limits ingestion receipt RPCs to the service role', async () => {
    const { foundation } = await readMigrations();
    const functions = [
      'start_intelligence_ingestion',
      'record_intelligence_source_run',
      'finish_intelligence_ingestion',
    ];

    for (const functionName of functions) {
      expect(foundation).toContain(`create function public.${functionName}`);
      expect(foundation).toContain(`revoke all on function public.${functionName}`);
      expect(foundation).toMatch(
        new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]*?to service_role`),
      );
    }
    expect(foundation).toContain('security definer');
    expect(foundation).toContain('set search_path = pg_catalog, private, public');
  });
});
