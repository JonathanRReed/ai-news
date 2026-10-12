-- Restore five proven published provider routes. Additive and idempotent.
-- Executed in arejerdupcduqhgdoyht at 2026-10-12 06:14:22.524902 UTC.
-- The original reviewed SQL hash is recorded in the companion provenance receipt.
-- expected_id is content_items.id; expected_legacy_id is the public article route ID.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$
declare repair record; target_id uuid; target_path text;
begin
  for repair in select * from (values
    ('provider-0045195481fb0a3cc1', 'ca84f4f1-2abe-1df3-be28-50b558a809db'::uuid, 'aab199ee-dc86-4d03-83ef-d0f7054dbbc4', 'https://deepmind.google/blog/accelerating-discovery-with-the-ai-for-math-initiative/', 'Accelerating discovery with the AI for Math Initiative', '2025-10-29T14:31:13.000Z'::timestamptz),
    ('provider-c0db56626898f83c32', 'c1e84d5d-6941-52ae-b610-8e6481a8861d'::uuid, 'd5ad6e9f-f271-4307-b352-cc96560e56f6', 'https://openai.com/index/introducing-life-sci-bench', 'Introducing LifeSciBench', '2026-06-17T00:00:00.000Z'::timestamptz),
    ('provider-fd7de8c19456d6d700', 'e0cf374c-5b3f-ac46-9132-7c019fa722c7'::uuid, '91444657-0c50-480c-9af2-8d5be06c10b3', 'https://huggingface.co/blog/gemma4', 'Welcome Gemma 4: Frontier multimodal intelligence on device', '2026-04-02T00:00:00.000Z'::timestamptz),
    ('provider-b5f756c4b535d7239b', '68b49188-9a52-e81b-e7c4-2f5af80bf56c'::uuid, '7a5eeee4-461d-4fb3-b675-586c3098a373', 'https://openai.com/index/advancing-youth-safety-and-opportunity-through-global-leadership', 'Advancing youth safety and opportunity through global leadership', '2026-06-02T07:00:00.000Z'::timestamptz),
    ('provider-5a42e1a49c5662b1ee', 'f07373ff-c28b-f252-8ac7-02717aa8ea81'::uuid, '2b2d4bfc-a9e6-4586-9de4-cd28d744e9dc', 'https://openai.com/academy/codex-for-work/how-data-science-teams-use-codex', 'How data science teams use ChatGPT Work', '2026-07-14T00:00:00.000Z'::timestamptz)
  ) as repairs(old_id, expected_id, expected_legacy_id, canonical_url, title, published_at)
  loop
    select id, '/article/' || legacy_id
      into strict target_id, target_path
      from public.content_items
      where id = repair.expected_id and legacy_id = repair.expected_legacy_id
        and canonical_url = repair.canonical_url
        and title = repair.title and published_at = repair.published_at
      for share;
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
