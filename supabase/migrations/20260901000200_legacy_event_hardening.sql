begin;

create index if not exists entity_relationships_child_entity_idx
  on public.entity_relationships (child_entity_id);

create index if not exists sources_entity_id_idx
  on public.sources (entity_id);

create index if not exists events_anchor_item_id_idx
  on public.events (anchor_item_id);

create index if not exists event_items_content_item_id_idx
  on public.event_items (content_item_id);

create or replace function private.import_legacy_ai_company_news()
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
    encode(
      digest(
        coalesce(news.title, '') || E'\n' || coalesce(news.summary, '') || E'\n' || coalesce(news.content, ''),
        'sha256'
      ),
      'hex'
    ),
    jsonb_build_object('legacy_source_type', news.source_type::text)
  from public.ai_company_news as news
  join public.entities as entity
    on entity.slug = regexp_replace(
      trim(both '-' from regexp_replace(lower(news.company), '[^a-z0-9]+', '-', 'g')),
      '-+',
      '-',
      'g'
    )
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

  insert into public.events (
    id,
    slug,
    title,
    event_type,
    significance,
    occurred_at,
    anchor_item_id,
    status,
    what_changed,
    metadata
  )
  select
    md5('legacy-event:' || item.id::text)::uuid,
    entity.slug
      || '-'
      || to_char(item.published_at at time zone 'UTC', 'YYYY-MM-DD')
      || '-legacy-'
      || left(replace(md5('legacy-event:' || item.id::text)::uuid::text, '-', ''), 12),
    item.title,
    item.item_type,
    'routine',
    item.published_at,
    item.id,
    'active',
    entity.name || ' published "' || item.title || '" through ' || source.name || '.',
    jsonb_build_object('classification_rule', 'legacy-import-v2')
  from public.content_items as item
  join public.sources as source on source.id = item.source_id
  join public.entities as entity on entity.id = source.entity_id
  where item.legacy_id is not null
    and not exists (
      select 1
      from public.events as existing
      where existing.anchor_item_id = item.id
    )
  on conflict (id) do nothing;

  insert into public.event_items (event_id, content_item_id, role)
  select event.id, event.anchor_item_id, 'anchor'
  from public.events as event
  join public.content_items as item on item.id = event.anchor_item_id
  where item.legacy_id is not null
  on conflict do nothing;

  insert into public.event_entities (event_id, entity_id, role)
  select event.id, source.entity_id, 'publisher'
  from public.events as event
  join public.content_items as item on item.id = event.anchor_item_id
  join public.sources as source on source.id = item.source_id
  where item.legacy_id is not null
  on conflict do nothing;

  return query select imported_content, imported_aliases;
end;
$$;

revoke all on function private.import_legacy_ai_company_news() from public, anon, authenticated;
grant execute on function private.import_legacy_ai_company_news() to service_role;

comment on function private.import_legacy_ai_company_news() is
  'Additive, idempotent legacy import with content, route, event, item, and publisher associations.';

do $$
begin
  if to_regprocedure('public.cleanup_old_news()') is not null then
    execute 'alter function public.cleanup_old_news() set search_path = pg_catalog, public';
  end if;
  if to_regprocedure('public.delete_old_news()') is not null then
    execute 'alter function public.delete_old_news() set search_path = pg_catalog, public';
  end if;
end;
$$;

select * from private.import_legacy_ai_company_news();

do $$
begin
  if exists (
    select 1
    from public.ai_company_news as news
    left join public.content_items as item on item.legacy_id = news.id::text
    left join public.route_aliases as alias on alias.legacy_id = news.id::text
    left join public.events as event on event.anchor_item_id = item.id
    left join public.event_items as event_item
      on event_item.event_id = event.id
      and event_item.content_item_id = item.id
      and event_item.role = 'anchor'
    left join public.sources as source on source.id = item.source_id
    left join public.event_entities as event_entity
      on event_entity.event_id = event.id
      and event_entity.entity_id = source.entity_id
      and event_entity.role = 'publisher'
    where item.id is null
      or alias.content_item_id is distinct from item.id
      or event.id is null
      or event_item.event_id is null
      or event_entity.event_id is null
  ) then
    raise exception 'legacy intelligence import left an incomplete content, route, or event graph'
      using errcode = '23514';
  end if;
end;
$$;

commit;
