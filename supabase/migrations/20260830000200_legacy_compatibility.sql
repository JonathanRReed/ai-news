begin;

do $$
begin
  if not exists (
    select 1
    from pg_type as type
    join pg_namespace as namespace on namespace.oid = type.typnamespace
    where namespace.nspname = 'public' and type.typname = 'news_source_type'
  ) then
    create type public.news_source_type as enum ('rss_official', 'rss_unofficial', 'scraped');
  end if;
end;
$$;

create table if not exists public.ai_company_news (
  id uuid primary key default gen_random_uuid(),
  company varchar not null,
  title text not null,
  url text not null unique,
  content text,
  summary text,
  published_at timestamptz not null,
  source_type public.news_source_type not null,
  source_url text not null,
  created_at timestamptz default now(),
  unique (company, url)
);

create index if not exists ai_company_news_company_idx
  on public.ai_company_news (company);
create index if not exists ai_company_news_published_at_idx
  on public.ai_company_news (published_at);

alter table public.ai_company_news enable row level security;
drop policy if exists "Allow read access for all users" on public.ai_company_news;

revoke all on public.ai_company_news from anon, authenticated;
grant all on public.ai_company_news to service_role;

create view public.ai_company_news_v1 with (security_invoker = true) as
select
  coalesce(item.legacy_id, item.id::text) as id,
  entity.name as company,
  item.title,
  item.canonical_url as url,
  item.content,
  item.excerpt as summary,
  item.published_at,
  coalesce(source.metadata ->> 'source_type', 'rss_official')::public.news_source_type as source_type,
  source.endpoint_url as source_url,
  item.first_seen_at as created_at,
  item.id as intelligence_id,
  item.item_type,
  item.published_at as cursor_published_at,
  item.id as cursor_id
from public.content_items as item
join public.sources as source on source.id = item.source_id
join public.entities as entity on entity.id = source.entity_id;

revoke all on public.ai_company_news_v1 from anon, authenticated;
grant select on public.ai_company_news_v1 to anon, authenticated;
grant all on public.ai_company_news_v1 to service_role;

create function private.import_legacy_ai_company_news()
returns table (content_items_inserted bigint, route_aliases_inserted bigint)
language plpgsql
security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  imported_content bigint := 0;
  imported_aliases bigint := 0;
begin
  if exists (
    select 1
    from public.ai_company_news as news
    left join public.entities as entity
      on entity.slug = regexp_replace(
        trim(both '-' from regexp_replace(lower(news.company), '[^a-z0-9]+', '-', 'g')),
        '-+',
        '-',
        'g'
      )
    left join public.sources as source
      on source.entity_id = entity.id
      and source.endpoint_url = news.source_url
    where source.id is null
  ) then
    raise exception 'legacy import contains a company or source URL outside the seeded catalog'
      using errcode = '22000';
  end if;

  insert into public.content_items (
    id,
    legacy_id,
    source_id,
    canonical_url,
    title,
    excerpt,
    content,
    item_type,
    published_at,
    first_seen_at,
    last_seen_at,
    content_hash,
    metadata
  )
  select
    md5('legacy-item:' || news.id::text)::uuid,
    news.id::text,
    source.id,
    news.url,
    news.title,
    news.summary,
    news.content,
    'other',
    news.published_at,
    coalesce(news.created_at, news.published_at),
    coalesce(news.created_at, news.published_at),
    encode(digest(coalesce(news.title, '') || E'\n' || coalesce(news.summary, '') || E'\n' || coalesce(news.content, ''), 'sha256'), 'hex'),
    jsonb_build_object('legacy_source_type', news.source_type::text)
  from public.ai_company_news as news
  join public.entities as entity
    on entity.slug = regexp_replace(trim(both '-' from regexp_replace(lower(news.company), '[^a-z0-9]+', '-', 'g')), '-+', '-', 'g')
  join public.sources as source
    on source.entity_id = entity.id
    and source.endpoint_url = news.source_url
  on conflict (canonical_url) do nothing;

  get diagnostics imported_content = row_count;

  insert into public.content_item_entities (content_item_id, entity_id, role)
  select item.id, source.entity_id, 'publisher'
  from public.content_items as item
  join public.sources as source on source.id = item.source_id
  where item.legacy_id is not null
  on conflict do nothing;

  insert into public.route_aliases (legacy_id, content_item_id, destination_path)
  select news.id::text, item.id, '/article/' || news.id::text
  from public.ai_company_news as news
  join public.content_items as item on item.legacy_id = news.id::text
  on conflict (legacy_id) do nothing;

  get diagnostics imported_aliases = row_count;
  return query select imported_content, imported_aliases;
end;
$$;

revoke all on function private.import_legacy_ai_company_news() from public, anon, authenticated;
grant execute on function private.import_legacy_ai_company_news() to service_role;

comment on function private.import_legacy_ai_company_news() is
  'Additive, idempotent import of admitted legacy rows. Seed the catalog and pass the pre-migration export gate first.';

commit;
