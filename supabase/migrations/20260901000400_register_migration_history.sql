begin;

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

revoke all on schema supabase_migrations from public, anon, authenticated;
revoke all on table supabase_migrations.schema_migrations from public, anon, authenticated;

insert into supabase_migrations.schema_migrations (
  version,
  statements,
  name
)
values
  ('20260830000100', '{}'::text[], 'intelligence_foundation'),
  ('20260830000200', '{}'::text[], 'legacy_compatibility'),
  ('20260901000100', '{}'::text[], 'safe_article_route_ids'),
  ('20260901000200', '{}'::text[], 'legacy_event_hardening'),
  ('20260901000300', '{}'::text[], 'remove_duplicate_legacy_constraint'),
  ('20260901000400', '{}'::text[], 'register_migration_history')
on conflict (version) do update set
  name = excluded.name;

commit;
