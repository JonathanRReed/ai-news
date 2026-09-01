begin;

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text,
  created_by text,
  idempotency_key text unique,
  rollback text[]
);

revoke all on schema supabase_migrations from public, anon, authenticated;
revoke all on table supabase_migrations.schema_migrations from public, anon, authenticated;

insert into supabase_migrations.schema_migrations (
  version,
  statements,
  name,
  created_by
)
values
  ('20260830000100', '{}'::text[], 'intelligence_foundation', 'dashboard-baseline-20260901'),
  ('20260830000200', '{}'::text[], 'legacy_compatibility', 'dashboard-baseline-20260901'),
  ('20260901000100', '{}'::text[], 'safe_article_route_ids', 'dashboard-baseline-20260901'),
  ('20260901000200', '{}'::text[], 'legacy_event_hardening', 'dashboard-baseline-20260901'),
  ('20260901000300', '{}'::text[], 'remove_duplicate_legacy_constraint', 'dashboard-baseline-20260901'),
  ('20260901000400', '{}'::text[], 'register_migration_history', 'dashboard-baseline-20260901')
on conflict (version) do update set
  name = excluded.name,
  created_by = excluded.created_by;

commit;
