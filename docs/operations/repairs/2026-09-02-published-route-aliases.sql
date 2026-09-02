-- AI News production repair, project arejerdupcduqhgdoyht.
-- Preserve two published cache IDs that predate their canonical legacy import.
-- Existing content and aliases are never overwritten.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  repair record;
  target_id uuid;
  target_path text;
begin
  for repair in
    select * from (values
      ('748ed6b8-8d57-5cf7-870c-b30af38394c1', 'https://openai.com/index/supporting-california-bill-advance-ai-youth-safety'),
      ('5666ddb7-5d5a-54cd-b454-6c01a40cf9bc', 'https://openai.com/index/polimill')
    ) as repairs(old_id, canonical_url)
  loop
    select id, '/article/' || coalesce(legacy_id, id::text)
    into strict target_id, target_path
    from public.content_items
    where canonical_url = repair.canonical_url;

    if exists (
      select 1 from public.route_aliases
      where legacy_id = repair.old_id
        and (content_item_id <> target_id or destination_path <> target_path)
    ) then
      raise exception 'Published route already points to a different article';
    end if;

    insert into public.route_aliases (legacy_id, content_item_id, destination_path)
    values (repair.old_id, target_id, target_path)
    on conflict (legacy_id) do nothing;
  end loop;
end;
$$;

commit;
