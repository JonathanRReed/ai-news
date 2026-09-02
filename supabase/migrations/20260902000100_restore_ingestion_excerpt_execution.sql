begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- The excerpt triggers run as the caller. Ingestion uses service_role, not
-- postgres, so it needs the private formatter without exposing it to readers.
grant execute on function private.ai_news_excerpt(text, integer) to service_role;

commit;
