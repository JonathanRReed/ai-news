begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'entities', 'entities exists');
select has_table('public', 'entity_relationships', 'entity relationships exist');
select has_table('public', 'sources', 'sources exists');
select has_table('public', 'content_items', 'content items exist');
select has_table('public', 'content_item_entities', 'content item entities exist');
select has_table('public', 'events', 'events exist');
select has_table('public', 'event_items', 'event items exist');
select has_table('public', 'event_entities', 'event entities exist');
select has_table('public', 'route_aliases', 'route aliases exist');
select has_table('private', 'ingestion_runs', 'private ingestion runs exist');
select has_table('private', 'ingestion_source_runs', 'private source runs exist');
select has_column('public', 'sources', 'allowed_hosts', 'sources store exact admitted hosts');
select is(
  (select count(*) from public.sources where source_key = 'openai-news'),
  1::bigint,
  'seeded source is available for host policy tests'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'content_items'
      and indexname = 'content_items_published_cursor_idx'
  ),
  'content cursor index exists'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'content_items'
      and indexname = 'content_items_search_idx'
      and indexdef ilike '%using gin%'
  ),
  'content search GIN index exists'
);

select ok(
  not exists (
    select 1
    from (values
      ('entity_relationships', 'entity_relationships_child_entity_idx'),
      ('sources', 'sources_entity_id_idx'),
      ('events', 'events_anchor_item_id_idx'),
      ('event_items', 'event_items_content_item_id_idx')
    ) as expected(table_name, index_name)
    left join pg_indexes as actual
      on actual.schemaname = 'public'
      and actual.tablename = expected.table_name
      and actual.indexname = expected.index_name
    where actual.indexname is null
  ),
  'foreign-key lookup indexes exist'
);

select ok(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid in (
      'public.entities'::regclass,
      'public.entity_relationships'::regclass,
      'public.sources'::regclass,
      'public.content_items'::regclass,
      'public.content_item_entities'::regclass,
      'public.events'::regclass,
      'public.event_items'::regclass,
      'public.event_entities'::regclass,
      'public.route_aliases'::regclass
    )
  ),
  'RLS is enabled on every public intelligence table'
);

select ok(
  not has_table_privilege('anon', 'public.content_items', 'INSERT')
    and not has_table_privilege('anon', 'public.content_items', 'UPDATE')
    and not has_table_privilege('anon', 'public.content_items', 'DELETE')
    and has_table_privilege('anon', 'public.content_items', 'SELECT'),
  'anon has read-only content item privileges'
);

select ok(
  not has_table_privilege('authenticated', 'public.events', 'INSERT')
    and not has_table_privilege('authenticated', 'public.events', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.events', 'DELETE')
    and has_table_privilege('authenticated', 'public.events', 'SELECT'),
  'authenticated has read-only event privileges'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE')
    and not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'browser roles cannot use the private schema'
);

select ok(
  has_schema_privilege('service_role', 'private', 'USAGE')
    and has_table_privilege('service_role', 'private.ingestion_runs', 'INSERT'),
  'service role can record private ingestion receipts'
);

select ok(
  (
    select bool_and(coalesce(reloptions, '{}'::text[]) @> array['security_invoker=true'])
    from pg_class
    where oid in (
      'public.intelligence_feed_v1'::regclass,
      'public.intelligence_entities_v1'::regclass,
      'public.intelligence_events_v1'::regclass,
      'public.intelligence_source_health_v1'::regclass,
      'public.intelligence_route_aliases_v1'::regclass,
      'public.ai_company_news_v1'::regclass
    )
  ),
  'all public projections use security invoker'
);

select ok(
  has_table_privilege('anon', 'public.intelligence_feed_v1', 'SELECT')
    and has_table_privilege('anon', 'public.intelligence_entities_v1', 'SELECT')
    and has_table_privilege('anon', 'public.intelligence_events_v1', 'SELECT')
    and has_table_privilege('anon', 'public.intelligence_source_health_v1', 'SELECT'),
  'anon can read every versioned projection'
);

select ok(
  not has_table_privilege('anon', 'public.ai_company_news', 'SELECT')
    and not has_table_privilege('authenticated', 'public.ai_company_news', 'SELECT')
    and has_table_privilege('anon', 'public.ai_company_news_v1', 'SELECT')
    and has_table_privilege('authenticated', 'public.ai_company_news_v1', 'SELECT'),
  'browser roles use only the admitted legacy compatibility projection'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated')
      and table_schema in ('public', 'private')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
  ),
  'browser roles have no mutation grants'
);

select throws_ok(
  $$
    insert into public.content_items (
      id, source_id, canonical_url, title, published_at, content_hash
    )
    select
      '10000000-0000-5000-8000-000000000001'::uuid,
      source.id,
      'https://attacker.example/not-admitted',
      'Rejected off-host item',
      '2026-08-30T00:00:00Z'::timestamptz,
      repeat('a', 64)
    from public.sources as source
    where source.source_key = 'openai-news'
  $$,
  '22000',
  'content item canonical URL host is not admitted for its source',
  'database rejects an off-host canonical URL'
);

select lives_ok(
  $$
    insert into public.content_items (
      id, source_id, canonical_url, title, published_at, content_hash
    )
    select
      '10000000-0000-5000-8000-000000000002'::uuid,
      source.id,
      'https://openai.com/index/admitted-database-test/',
      'Admitted source item',
      '2026-08-30T00:00:00Z'::timestamptz,
      repeat('b', 64)
    from public.sources as source
    where source.source_key = 'openai-news'
  $$,
  'database accepts an admitted canonical host'
);

select throws_ok(
  $$
    update public.content_items
    set legacy_id = '../about'
    where id = '10000000-0000-5000-8000-000000000002'::uuid
  $$,
  '23514',
  null,
  'database rejects an unsafe legacy article route id'
);

select lives_ok(
  $$
    update public.content_items
    set legacy_id = 'legacy-openai-release'
    where id = '10000000-0000-5000-8000-000000000002'::uuid
  $$,
  'database accepts a compatible legacy article route id'
);

select throws_ok(
  $$
    insert into public.route_aliases (legacy_id, content_item_id, destination_path)
    values (
      '%2fadmin',
      '10000000-0000-5000-8000-000000000002'::uuid,
      '/article/legacy-openai-release'
    )
  $$,
  '23514',
  null,
  'database rejects an encoded separator in a route alias'
);

select lives_ok(
  $$
    insert into public.ai_company_news (
      id,
      company,
      title,
      url,
      content,
      summary,
      published_at,
      source_type,
      source_url,
      created_at
    )
    select
      '20000000-0000-5000-8000-000000000001'::uuid,
      entity.name,
      'Legacy event graph database test',
      'https://openai.com/index/legacy-event-graph-database-test/',
      'Legacy event graph content.',
      'Legacy event graph summary.',
      '2026-08-30T01:00:00Z'::timestamptz,
      'rss_official'::public.news_source_type,
      source.endpoint_url,
      '2026-08-30T01:00:00Z'::timestamptz
    from public.sources as source
    join public.entities as entity on entity.id = source.entity_id
    where source.source_key = 'openai-news'
  $$,
  'legacy compatibility row can be staged for import'
);

select lives_ok(
  $$ select * from private.import_legacy_ai_company_news() $$,
  'legacy import completes without error'
);

select ok(
  exists (
    select 1
    from public.content_items as item
    join public.route_aliases as alias on alias.content_item_id = item.id
    join public.events as event on event.anchor_item_id = item.id
    join public.event_items as event_item
      on event_item.event_id = event.id
      and event_item.content_item_id = item.id
      and event_item.role = 'anchor'
    join public.sources as source on source.id = item.source_id
    join public.event_entities as event_entity
      on event_entity.event_id = event.id
      and event_entity.entity_id = source.entity_id
      and event_entity.role = 'publisher'
    where item.legacy_id = '20000000-0000-5000-8000-000000000001'
      and alias.legacy_id = item.legacy_id
  ),
  'legacy import creates a complete content, route, and event graph'
);

select * from finish();
rollback;
