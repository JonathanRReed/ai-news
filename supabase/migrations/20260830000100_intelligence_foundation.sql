begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  entity_type text not null check (
    entity_type in ('lab', 'provider', 'model', 'harness', 'research_org', 'product')
  ),
  status text not null default 'active' check (status in ('active', 'watchlist', 'archived')),
  homepage_url text check (
    homepage_url is null
    or (homepage_url ~ '^https://' and homepage_url !~ '^https://[^/?#]*@')
  ),
  summary text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entity_relationships (
  parent_entity_id uuid not null references public.entities(id) on delete restrict,
  child_entity_id uuid not null references public.entities(id) on delete restrict,
  relationship_type text not null check (
    relationship_type in ('develops', 'publishes', 'maintains', 'owns', 'integrates', 'successor_of')
  ),
  created_at timestamptz not null default now(),
  primary key (parent_entity_id, child_entity_id, relationship_type),
  check (parent_entity_id <> child_entity_id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null check (source_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  entity_id uuid not null references public.entities(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  official_url text not null check (
    official_url ~ '^https://' and official_url !~ '^https://[^/?#]*@'
  ),
  endpoint_url text not null check (
    endpoint_url ~ '^https://' and endpoint_url !~ '^https://[^/?#]*@'
  ),
  allowed_hosts text[] not null check (cardinality(allowed_hosts) > 0),
  transport_type text not null check (
    transport_type in ('rss', 'atom', 'json_api', 'github_releases', 'sitemap', 'html')
  ),
  source_role text not null check (
    source_role in ('newsroom', 'changelog', 'research', 'model_cards', 'documentation', 'releases')
  ),
  parser_key text not null check (btrim(parser_key) <> ''),
  active boolean not null default true,
  required boolean not null default false,
  verified_at timestamptz not null,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_item_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  etag text,
  last_modified text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key,
  legacy_id text unique,
  source_id uuid not null references public.sources(id) on delete restrict,
  external_id text,
  canonical_url text unique not null check (canonical_url ~ '^https://'),
  title text not null check (btrim(title) <> ''),
  excerpt text,
  content text,
  item_type text not null default 'other' check (
    item_type in (
      'announcement',
      'model_release',
      'api_change',
      'deprecation',
      'research',
      'benchmark',
      'security',
      'harness_release',
      'documentation',
      'other'
    )
  ),
  published_at timestamptz not null,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored,
  check (first_seen_at <= last_seen_at)
);

create unique index content_items_source_external_key on public.content_items (source_id, external_id) where external_id is not null;
create index content_items_published_cursor_idx on public.content_items (published_at desc, id desc);
create index content_items_search_idx on public.content_items using gin (search_document);
create index content_items_item_type_cursor_idx on public.content_items (item_type, published_at desc, id desc);
create index content_items_source_cursor_idx on public.content_items (source_id, published_at desc, id desc);

create table public.content_item_entities (
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  entity_id uuid not null references public.entities(id) on delete restrict,
  role text not null check (role in ('publisher', 'subject', 'model', 'harness', 'mentioned')),
  created_at timestamptz not null default now(),
  primary key (content_item_id, entity_id, role)
);

create index content_item_entities_entity_idx
  on public.content_item_entities (entity_id, role, content_item_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  event_type text not null check (
    event_type in (
      'announcement',
      'model_release',
      'api_change',
      'deprecation',
      'research',
      'benchmark',
      'security',
      'harness_release',
      'documentation',
      'other'
    )
  ),
  significance text not null default 'routine' check (significance in ('routine', 'notable', 'major')),
  significance_reason text,
  occurred_at timestamptz not null,
  anchor_item_id uuid not null references public.content_items(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'resolved', 'superseded')),
  what_changed text not null check (btrim(what_changed) <> ''),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (significance <> 'major' or nullif(btrim(significance_reason), '') is not null)
);

create index events_occurred_cursor_idx on public.events (occurred_at desc, id desc);
create index events_significance_cursor_idx on public.events (significance, occurred_at desc, id desc);

create table public.event_items (
  event_id uuid not null references public.events(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  role text not null check (role in ('anchor', 'official_update', 'supporting')),
  created_at timestamptz not null default now(),
  primary key (event_id, content_item_id),
  unique (event_id, role, content_item_id)
);

create unique index event_items_one_anchor_idx
  on public.event_items (event_id)
  where role = 'anchor';

create table public.event_entities (
  event_id uuid not null references public.events(id) on delete restrict,
  entity_id uuid not null references public.entities(id) on delete restrict,
  role text not null check (role in ('publisher', 'subject', 'model', 'harness', 'mentioned')),
  created_at timestamptz not null default now(),
  primary key (event_id, entity_id, role)
);

create index event_entities_entity_idx on public.event_entities (entity_id, event_id);

create table public.route_aliases (
  legacy_id text primary key check (btrim(legacy_id) <> ''),
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  destination_path text not null check (destination_path ~ '^/'),
  created_at timestamptz not null default now()
);

create index route_aliases_content_item_idx on public.route_aliases (content_item_id);

create table private.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  trigger_source text not null default 'manual' check (trigger_source in ('manual', 'schedule', 'workflow', 'backfill')),
  source_count integer not null default 0 check (source_count >= 0),
  succeeded_count integer not null default 0 check (succeeded_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  receipt_sha256 text check (receipt_sha256 is null or receipt_sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (completed_at is null or completed_at >= started_at)
);

create index ingestion_runs_started_idx on private.ingestion_runs (started_at desc, id desc);

create table private.ingestion_source_runs (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references private.ingestion_runs(id) on delete restrict,
  source_id uuid not null references public.sources(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'not_modified', 'failed')),
  http_status integer check (http_status is null or http_status between 100 and 599),
  item_count integer not null default 0 check (item_count >= 0),
  etag text,
  last_modified text,
  sanitized_error text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (ingestion_run_id, source_id),
  check (completed_at is null or completed_at >= started_at)
);

create index ingestion_source_runs_source_idx
  on private.ingestion_source_runs (source_id, started_at desc, id desc);

create function public.start_intelligence_ingestion(
  p_trigger_source text,
  p_source_count integer,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  new_run_id uuid;
begin
  insert into private.ingestion_runs (trigger_source, source_count, metadata)
  values (p_trigger_source, p_source_count, coalesce(p_metadata, '{}'::jsonb))
  returning id into new_run_id;
  return new_run_id;
end;
$$;

create function public.record_intelligence_source_run(
  p_ingestion_run_id uuid,
  p_source_id uuid,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_status text,
  p_http_status integer,
  p_item_count integer,
  p_etag text,
  p_last_modified text,
  p_sanitized_error text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
begin
  insert into private.ingestion_source_runs (
    ingestion_run_id,
    source_id,
    started_at,
    completed_at,
    status,
    http_status,
    item_count,
    etag,
    last_modified,
    sanitized_error,
    metadata
  )
  values (
    p_ingestion_run_id,
    p_source_id,
    p_started_at,
    p_completed_at,
    p_status,
    p_http_status,
    p_item_count,
    p_etag,
    p_last_modified,
    p_sanitized_error,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (ingestion_run_id, source_id) do update set
    completed_at = excluded.completed_at,
    status = excluded.status,
    http_status = excluded.http_status,
    item_count = excluded.item_count,
    etag = excluded.etag,
    last_modified = excluded.last_modified,
    sanitized_error = excluded.sanitized_error,
    metadata = excluded.metadata;
end;
$$;

create function public.finish_intelligence_ingestion(
  p_ingestion_run_id uuid,
  p_completed_at timestamptz,
  p_status text,
  p_succeeded_count integer,
  p_failed_count integer,
  p_item_count integer,
  p_receipt_sha256 text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
begin
  update private.ingestion_runs set
    completed_at = p_completed_at,
    status = p_status,
    succeeded_count = p_succeeded_count,
    failed_count = p_failed_count,
    item_count = p_item_count,
    receipt_sha256 = p_receipt_sha256,
    metadata = coalesce(p_metadata, '{}'::jsonb)
  where id = p_ingestion_run_id;

  if not found then
    raise exception 'ingestion run not found' using errcode = 'P0002';
  end if;
end;
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.enforce_content_item_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.id is distinct from old.id
    or new.source_id is distinct from old.source_id
    or new.canonical_url is distinct from old.canonical_url
    or new.published_at is distinct from old.published_at
    or new.first_seen_at is distinct from old.first_seen_at
    or (old.legacy_id is not null and new.legacy_id is distinct from old.legacy_id)
  then
    raise exception 'content item identity fields are immutable' using errcode = '22000';
  end if;
  return new;
end;
$$;

create function private.enforce_content_item_source_host()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  canonical_authority text;
  canonical_host text;
  admitted_hosts text[];
begin
  canonical_authority := lower(substring(new.canonical_url from '^https://([^/?#]+)'));
  canonical_host := split_part(canonical_authority, ':', 1);

  if canonical_authority is null
    or canonical_host = ''
    or (
      canonical_authority <> canonical_host
      and canonical_authority <> canonical_host || ':443'
    )
  then
    raise exception 'content item canonical URL must use admitted HTTPS host'
      using errcode = '22000';
  end if;

  select source.allowed_hosts
  into admitted_hosts
  from public.sources as source
  where source.id = new.source_id;

  if admitted_hosts is null or not (canonical_host = any(admitted_hosts)) then
    raise exception 'content item canonical URL host is not admitted for its source'
      using errcode = '22000';
  end if;

  return new;
end;
$$;

create trigger entities_touch_updated_at
before update on public.entities
for each row execute function private.touch_updated_at();

create trigger sources_touch_updated_at
before update on public.sources
for each row execute function private.touch_updated_at();

create trigger events_touch_updated_at
before update on public.events
for each row execute function private.touch_updated_at();

create trigger content_items_enforce_immutability
before update on public.content_items
for each row execute function private.enforce_content_item_immutability();

create trigger content_items_enforce_source_host
before insert or update of source_id, canonical_url on public.content_items
for each row execute function private.enforce_content_item_source_host();

alter table public.entities enable row level security;
alter table public.entity_relationships enable row level security;
alter table public.sources enable row level security;
alter table public.content_items enable row level security;
alter table public.content_item_entities enable row level security;
alter table public.events enable row level security;
alter table public.event_items enable row level security;
alter table public.event_entities enable row level security;
alter table public.route_aliases enable row level security;

create policy entities_public_read on public.entities for select to anon, authenticated using (true);
create policy entity_relationships_public_read on public.entity_relationships for select to anon, authenticated using (true);
create policy sources_public_read on public.sources for select to anon, authenticated using (true);
create policy content_items_public_read on public.content_items for select to anon, authenticated using (true);
create policy content_item_entities_public_read on public.content_item_entities for select to anon, authenticated using (true);
create policy events_public_read on public.events for select to anon, authenticated using (true);
create policy event_items_public_read on public.event_items for select to anon, authenticated using (true);
create policy event_entities_public_read on public.event_entities for select to anon, authenticated using (true);
create policy route_aliases_public_read on public.route_aliases for select to anon, authenticated using (true);

create view public.intelligence_entities_v1 with (security_invoker = true) as
select
  entity.id,
  entity.slug,
  entity.name,
  entity.entity_type,
  entity.status,
  entity.homepage_url,
  entity.summary,
  entity.metadata,
  entity.created_at,
  entity.updated_at,
  count(distinct source.id) filter (where source.active) as active_source_count,
  count(distinct content_entity.content_item_id) as content_item_count
from public.entities as entity
left join public.sources as source on source.entity_id = entity.id
left join public.content_item_entities as content_entity on content_entity.entity_id = entity.id
group by entity.id;

create view public.intelligence_source_health_v1 with (security_invoker = true) as
select
  source.id,
  source.source_key,
  source.name,
  entity.slug as entity_slug,
  entity.name as entity_name,
  source.transport_type,
  source.source_role,
  source.active,
  source.required,
  source.verified_at,
  source.last_checked_at,
  source.last_success_at,
  source.last_item_at,
  source.consecutive_failures,
  case
    when not source.active then 'inactive'
    when source.consecutive_failures >= 3 then 'failing'
    when source.last_success_at is null then 'pending'
    when source.last_success_at < now() - interval '72 hours' then 'stale'
    else 'healthy'
  end as health
from public.sources as source
join public.entities as entity on entity.id = source.entity_id;

create view public.intelligence_feed_v1 with (security_invoker = true) as
select
  item.id,
  item.legacy_id,
  item.canonical_url,
  item.title,
  item.excerpt,
  item.content,
  item.item_type,
  item.published_at,
  item.source_updated_at,
  item.first_seen_at,
  item.last_seen_at,
  item.metadata,
  source.source_key,
  source.name as source_name,
  source.endpoint_url as source_url,
  coalesce(source.metadata ->> 'source_type', 'rss_official') as source_type,
  entity.id as entity_id,
  entity.slug as entity_slug,
  entity.name as entity_name,
  entity.entity_type,
  event.id as event_id,
  event.slug as event_slug,
  event.title as event_title,
  event.significance as event_significance,
  event.significance_reason
from public.content_items as item
join public.sources as source on source.id = item.source_id
join public.entities as entity on entity.id = source.entity_id
left join lateral (
  select candidate.*
  from public.event_items as event_item
  join public.events as candidate on candidate.id = event_item.event_id
  where event_item.content_item_id = item.id
  order by
    case candidate.significance when 'major' then 3 when 'notable' then 2 else 1 end desc,
    candidate.occurred_at desc,
    candidate.id desc
  limit 1
) as event on true;

create view public.intelligence_events_v1 with (security_invoker = true) as
select
  event.id,
  event.slug,
  event.title,
  event.event_type,
  event.significance,
  event.significance_reason,
  event.occurred_at,
  event.status,
  event.what_changed,
  event.metadata,
  event.anchor_item_id,
  anchor.canonical_url as anchor_url,
  anchor.title as anchor_title,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'id', entity.id,
        'slug', entity.slug,
        'name', entity.name,
        'type', entity.entity_type,
        'role', event_entity.role
      )
    ) filter (where entity.id is not null),
    '[]'::jsonb
  ) as entities
from public.events as event
join public.content_items as anchor on anchor.id = event.anchor_item_id
left join public.event_entities as event_entity on event_entity.event_id = event.id
left join public.entities as entity on entity.id = event_entity.entity_id
group by event.id, anchor.id;

create view public.intelligence_route_aliases_v1 with (security_invoker = true) as
select legacy_id, content_item_id, destination_path, created_at
from public.route_aliases;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.entities,
  public.entity_relationships,
  public.sources,
  public.content_items,
  public.content_item_entities,
  public.events,
  public.event_items,
  public.event_entities,
  public.route_aliases
to anon, authenticated;

grant select on public.intelligence_feed_v1 to anon, authenticated;
grant select on public.intelligence_entities_v1 to anon, authenticated;
grant select on public.intelligence_events_v1 to anon, authenticated;
grant select on public.intelligence_source_health_v1 to anon, authenticated;
grant select on public.intelligence_route_aliases_v1 to anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all tables in schema private to service_role;
grant all on all sequences in schema private to service_role;

revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_content_item_immutability() from public, anon, authenticated;
revoke all on function private.enforce_content_item_source_host() from public, anon, authenticated;
grant execute on function private.touch_updated_at() to service_role;
grant execute on function private.enforce_content_item_immutability() to service_role;
grant execute on function private.enforce_content_item_source_host() to service_role;

revoke all on function public.start_intelligence_ingestion(text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_intelligence_source_run(uuid, uuid, timestamptz, timestamptz, text, integer, integer, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.finish_intelligence_ingestion(uuid, timestamptz, text, integer, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.start_intelligence_ingestion(text, integer, jsonb) to service_role;
grant execute on function public.record_intelligence_source_run(uuid, uuid, timestamptz, timestamptz, text, integer, integer, text, text, text, jsonb) to service_role;
grant execute on function public.finish_intelligence_ingestion(uuid, timestamptz, text, integer, integer, integer, text, jsonb) to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private grant all on tables to service_role;
alter default privileges in schema private grant all on sequences to service_role;

comment on table public.content_items is
  'Immutable-identity first-party records. Only enrichment fields and last_seen_at may change.';
comment on view public.intelligence_feed_v1 is
  'Versioned chronological public read contract ordered by published_at and id.';
comment on schema private is
  'Operational ingestion receipts. This schema is not exposed through the public Data API.';

commit;
