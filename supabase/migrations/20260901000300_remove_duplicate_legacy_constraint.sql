begin;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_company_news'::regclass
      and conname = 'unique_article'
      and contype = 'u'
  ) and exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_company_news'::regclass
      and conname = 'ai_company_news_company_url_key'
      and contype = 'u'
  ) and not exists (
    select 1
    from pg_constraint
    where confrelid = 'public.ai_company_news'::regclass
      and confkey is not null
  ) then
    alter table public.ai_company_news
      drop constraint unique_article;
  end if;
end;
$$;

do $$
begin
  if (
    select count(*)
    from pg_index as index
    where index.indrelid = 'public.ai_company_news'::regclass
      and index.indisunique
      and (
        select array_agg(attribute.attname order by key.ordinality)
        from unnest(index.indkey) with ordinality as key(attnum, ordinality)
        join pg_attribute as attribute
          on attribute.attrelid = index.indrelid
          and attribute.attnum = key.attnum
      ) = array['company', 'url']::name[]
  ) <> 1 then
    raise exception 'ai_company_news must retain exactly one unique company and URL constraint'
      using errcode = '23514';
  end if;
end;
$$;

commit;
