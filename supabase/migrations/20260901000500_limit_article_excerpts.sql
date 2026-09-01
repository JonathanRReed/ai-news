begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function private.ai_news_excerpt(value text, max_length integer default 500)
returns text
language plpgsql
immutable
parallel safe
set search_path = pg_catalog
as $$
declare
  clean_value text;
  clipped_value text;
  reverse_space integer;
  boundary integer;
begin
  if value is null then
    return null;
  end if;
  if max_length < 4 then
    raise exception 'article excerpt maximum must be at least 4 characters'
      using errcode = '22023';
  end if;

  clean_value := regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g');
  if char_length(clean_value) <= max_length then
    return clean_value;
  end if;

  clipped_value := left(clean_value, max_length - 3);
  reverse_space := strpos(reverse(clipped_value), ' ');
  boundary := char_length(clipped_value) - reverse_space + 1;
  if reverse_space > 0 and boundary >= floor((max_length - 3) * 0.6) then
    clipped_value := left(clipped_value, boundary - 1);
  end if;
  return rtrim(clipped_value) || '...';
end;
$$;

create or replace function private.limit_content_item_excerpt()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.excerpt := private.ai_news_excerpt(new.excerpt);
  return new;
end;
$$;

create or replace function private.limit_legacy_news_summary()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.summary := private.ai_news_excerpt(new.summary);
  return new;
end;
$$;

revoke all on function private.ai_news_excerpt(text, integer) from public, anon, authenticated;
revoke all on function private.limit_content_item_excerpt() from public, anon, authenticated;
revoke all on function private.limit_legacy_news_summary() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'content_items_limit_excerpt'
      and tgrelid = 'public.content_items'::regclass
      and not tgisinternal
  ) then
    execute 'create trigger content_items_limit_excerpt
      before insert or update of excerpt on public.content_items
      for each row execute function private.limit_content_item_excerpt()';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'ai_company_news_limit_summary'
      and tgrelid = 'public.ai_company_news'::regclass
      and not tgisinternal
  ) then
    execute 'create trigger ai_company_news_limit_summary
      before insert or update of summary on public.ai_company_news
      for each row execute function private.limit_legacy_news_summary()';
  end if;
end;
$$;

update public.content_items
set excerpt = private.ai_news_excerpt(excerpt)
where char_length(excerpt) > 500;

update public.ai_company_news
set summary = private.ai_news_excerpt(summary)
where char_length(summary) > 500;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'content_items_excerpt_length'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_excerpt_length
      check (excerpt is null or char_length(excerpt) <= 500);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'ai_company_news_summary_length'
      and conrelid = 'public.ai_company_news'::regclass
  ) then
    alter table public.ai_company_news
      add constraint ai_company_news_summary_length
      check (summary is null or char_length(summary) <= 500);
  end if;
end;
$$;

commit;
