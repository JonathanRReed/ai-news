import { readFile } from 'node:fs/promises';

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
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function verifyRouteAliases(articles, aliases) {
  const articleIds = articles.map(({ id }) => id).filter((id) => typeof id === 'string');
  const articleIdSet = new Set(articleIds);
  const duplicateArticleIds = duplicates(articleIds);
  const missingTargets = [];
  const invalidAliases = [];
  const aliasIds = new Set();

  for (const alias of aliases) {
    if (
      !alias
      || typeof alias.legacy_id !== 'string'
      || !alias.legacy_id
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
    ok: duplicateArticleIds.length === 0 && missingTargets.length === 0 && invalidAliases.length === 0,
    duplicateArticleIds,
    missingTargets: missingTargets.sort(),
    invalidAliases: invalidAliases.sort(),
  };
}

if (import.meta.main) {
  const articles = JSON.parse(await readFile('public/data/provider-articles.json', 'utf8'));
  const aliases = JSON.parse(await readFile('public/data/route-aliases.json', 'utf8'));
  const result = verifyRouteAliases(articles, aliases);
  globalThis.console.log(JSON.stringify(result));
  if (!result.ok) globalThis.process.exitCode = 1;
}
