import { readFile } from 'node:fs/promises';
import { isSafeArticleRouteId } from '../../src/lib/articleRoutes.ts';
import { isArticleAdmitted } from '../../src/lib/articleAdmission.ts';

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function targetId(path) {
  if (typeof path !== 'string') return null;
  const match = path.match(/^\/article\/([^/]+)\/?$/);
  return match && isSafeArticleRouteId(match[1]) ? match[1] : null;
}

export function verifyRouteAliases(articles, aliases) {
  const articleIds = articles.map(({ id }) => id).filter((id) => typeof id === 'string');
  const articleIdSet = new Set(articleIds);
  const duplicateArticleIds = duplicates(articleIds);
  const invalidArticleIds = articleIds.filter((id) => !isSafeArticleRouteId(id)).sort();
  const missingTargets = [];
  const invalidAliases = [];
  const aliasIds = new Set();

  for (const alias of aliases) {
    if (
      !alias
      || !isSafeArticleRouteId(alias.legacy_id)
      || aliasIds.has(alias.legacy_id)
    ) {
      invalidAliases.push(alias?.legacy_id ?? '<missing>');
      continue;
    }
    aliasIds.add(alias.legacy_id);
    const target = targetId(alias.destination_path);
    if (!target) {
      invalidAliases.push(alias.legacy_id);
      continue;
    }
    if (articleIdSet.has(alias.legacy_id) && alias.legacy_id !== target) {
      invalidAliases.push(alias.legacy_id);
      continue;
    }
    if (!articleIdSet.has(target)) missingTargets.push(`${alias.legacy_id} -> ${target}`);
  }

  return {
    ok: duplicateArticleIds.length === 0
      && invalidArticleIds.length === 0
      && missingTargets.length === 0
      && invalidAliases.length === 0,
    duplicateArticleIds,
    invalidArticleIds,
    missingTargets: missingTargets.sort(),
    invalidAliases: invalidAliases.sort(),
  };
}

export function verifyLegacyArticleRecords(records) {
  const ids = records.map((record) => record?.id).filter((id) => typeof id === 'string');
  const duplicateIds = duplicates(ids);
  const invalidRecords = records
    .filter((record) => !record || !isSafeArticleRouteId(record.id) || !isArticleAdmitted(record))
    .map((record) => record?.id ?? '<missing>');
  return { ok: duplicateIds.length === 0 && invalidRecords.length === 0, duplicateIds, invalidRecords };
}

if (import.meta.main) {
  const articles = JSON.parse(await readFile('public/data/provider-articles.json', 'utf8'));
  const aliases = JSON.parse(await readFile('public/data/route-aliases.json', 'utf8'));
  const legacyRecords = JSON.parse(await readFile('src/data/legacy-article-records.json', 'utf8'));
  const routes = verifyRouteAliases(articles, aliases);
  const legacy = verifyLegacyArticleRecords(legacyRecords);
  globalThis.console.log(JSON.stringify({ routes, legacy }));
  if (!routes.ok || !legacy.ok) globalThis.process.exitCode = 1;
}
