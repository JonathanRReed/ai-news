-- Restore three proven published AI News provider IDs. Additive and idempotent.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$
declare repair record; target_id uuid; target_path text;
begin
  for repair in select * from (values
    ('provider-7190b4349fcb77ee5d', 'cd51c0ba-912c-6f9b-354f-423e64f5ed9e'::uuid, '34481a07-ed17-495a-b383-4d67e587498a', 'https://deepmind.google/blog/how-ai-is-giving-northern-ireland-teachers-time-back/'),
    ('provider-b2f528cbf6adda4b79', '11e3a62e-e321-6bfd-f4b5-eb9a352da4e5'::uuid, 'a571d18c-b45e-4f63-98ab-57dee88b3cb8', 'https://deepmind.google/blog/weathernext-2-our-most-advanced-weather-forecasting-model/'),
    ('provider-aae0850fe609d7dcc5', 'bfc07c0c-2f0f-a78d-59d7-9bf4b28dce2c'::uuid, 'b46a3df2-8643-405e-b1ca-77a12ab6c637', 'https://deepmind.google/blog/t5gemma-a-new-collection-of-encoder-decoder-gemma-models/')
  ) as repairs(old_id, expected_id, expected_legacy_id, canonical_url)
  loop
    select id, '/article/' || coalesce(legacy_id, id::text)
      into strict target_id, target_path
      from public.content_items
      where id = repair.expected_id and legacy_id = repair.expected_legacy_id
        and canonical_url = repair.canonical_url;
    if exists (select 1 from public.route_aliases
      where legacy_id = repair.old_id
        and (content_item_id is distinct from target_id or destination_path is distinct from target_path)) then
      raise exception 'Published route already points to a different article: %', repair.old_id;
    end if;
    insert into public.route_aliases (legacy_id, content_item_id, destination_path)
      values (repair.old_id, target_id, target_path)
      on conflict (legacy_id) do nothing;
    perform 1 from public.route_aliases where legacy_id = repair.old_id for update;
    if not exists (select 1 from public.route_aliases
      where legacy_id = repair.old_id
        and content_item_id is not distinct from target_id
        and destination_path is not distinct from target_path) then
      raise exception 'Published route changed concurrently: %', repair.old_id;
    end if;
  end loop;
end;
$$;
commit;
