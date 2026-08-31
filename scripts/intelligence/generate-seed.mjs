import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entities, sources } from '../../config/intelligence-sources.mjs';
import { manifestRows } from './ingest.mjs';

const ENTITY_DELIMITER = '$ai_news_entities$';
const SOURCE_DELIMITER = '$ai_news_sources$';

function jsonLiteral(value, delimiter) {
  const serialized = JSON.stringify(value);
  if (serialized.includes(delimiter)) throw new Error('manifest contains the SQL seed delimiter');
  return `${delimiter}${serialized}${delimiter}::jsonb`;
}

export function renderSeedSql(manifest) {
  const { entityRows, sourceRows } = manifestRows(manifest);
  const entityJson = jsonLiteral(entityRows, ENTITY_DELIMITER);
  const sourceJson = jsonLiteral(sourceRows, SOURCE_DELIMITER);

  return `-- Generated from config/intelligence-sources.mjs. Do not edit by hand.
-- entities: ${entityRows.length}
-- sources: ${sourceRows.length}

begin;

with input as (
  select * from jsonb_to_recordset(${entityJson}) as entity(
    id uuid,
    slug text,
    name text,
    entity_type text,
    status text,
    homepage_url text,
    summary text,
    metadata jsonb
  )
)
insert into public.entities (id, slug, name, entity_type, status, homepage_url, summary, metadata)
select id, slug, name, entity_type, status, homepage_url, summary, metadata
from input
on conflict (slug) do update set
  name = excluded.name,
  entity_type = excluded.entity_type,
  status = excluded.status,
  homepage_url = excluded.homepage_url,
  summary = excluded.summary,
  metadata = excluded.metadata;

with input as (
  select * from jsonb_to_recordset(${sourceJson}) as source(
    id uuid,
    source_key text,
    entity_id uuid,
    name text,
    official_url text,
    endpoint_url text,
    allowed_hosts text[],
    transport_type text,
    source_role text,
    parser_key text,
    active boolean,
    required boolean,
    verified_at timestamptz,
    metadata jsonb
  )
)
insert into public.sources (
  id,
  source_key,
  entity_id,
  name,
  official_url,
  endpoint_url,
  allowed_hosts,
  transport_type,
  source_role,
  parser_key,
  active,
  required,
  verified_at,
  metadata
)
select
  id,
  source_key,
  entity_id,
  name,
  official_url,
  endpoint_url,
  allowed_hosts,
  transport_type,
  source_role,
  parser_key,
  active,
  required,
  verified_at,
  metadata
from input
on conflict (source_key) do update set
  entity_id = excluded.entity_id,
  name = excluded.name,
  official_url = excluded.official_url,
  endpoint_url = excluded.endpoint_url,
  allowed_hosts = excluded.allowed_hosts,
  transport_type = excluded.transport_type,
  source_role = excluded.source_role,
  parser_key = excluded.parser_key,
  active = excluded.active,
  required = excluded.required,
  verified_at = excluded.verified_at,
  metadata = excluded.metadata;

commit;
`;
}

export function renderCatalogJson(manifest) {
  return `${JSON.stringify({
    schemaVersion: 1,
    entities: manifest.entities,
    sources: manifest.sources,
  }, null, 2)}\n`;
}

if (import.meta.main) {
  const seedPath = fileURLToPath(new URL('../../supabase/seed.sql', import.meta.url));
  const catalogPath = fileURLToPath(new URL('../../src/data/intelligence-catalog.json', import.meta.url));
  const sql = renderSeedSql({ entities, sources });
  await mkdir(dirname(catalogPath), { recursive: true });
  await writeFile(seedPath, sql, 'utf8');
  await writeFile(catalogPath, renderCatalogJson({ entities, sources }), 'utf8');
  globalThis.console.log(
    `Wrote ${entities.length} entities and ${sources.length} sources to ${seedPath} and ${catalogPath}`,
  );
}
