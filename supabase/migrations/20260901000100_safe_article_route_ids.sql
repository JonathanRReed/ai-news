begin;

do $$
begin
  if exists (
    select 1
    from public.content_items
    where legacy_id is not null
      and (
        legacy_id !~ '^[A-Za-z0-9._~-]+$'
        or legacy_id in ('.', '..')
      )
  ) then
    raise exception 'content_items contains an unsafe legacy article route id'
      using errcode = '22000';
  end if;

  if exists (
    select 1
    from public.route_aliases
    where legacy_id !~ '^[A-Za-z0-9._~-]+$'
      or legacy_id in ('.', '..')
      or destination_path !~ '^/article/[A-Za-z0-9._~-]+/?$'
      or destination_path in ('/article/.', '/article/./', '/article/..', '/article/../')
  ) then
    raise exception 'route_aliases contains an unsafe article route'
      using errcode = '22000';
  end if;
end;
$$;

alter table public.content_items
  add constraint content_items_legacy_id_safe
  check (
    legacy_id is null
    or (
      legacy_id ~ '^[A-Za-z0-9._~-]+$'
      and legacy_id not in ('.', '..')
    )
  );

alter table public.route_aliases
  add constraint route_aliases_legacy_id_safe
  check (
    legacy_id ~ '^[A-Za-z0-9._~-]+$'
    and legacy_id not in ('.', '..')
  );

alter table public.route_aliases
  add constraint route_aliases_destination_path_safe
  check (
    destination_path ~ '^/article/[A-Za-z0-9._~-]+/?$'
    and destination_path not in ('/article/.', '/article/./', '/article/..', '/article/../')
  );

commit;
