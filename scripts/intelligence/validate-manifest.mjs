import process from 'node:process';
import { URL } from 'node:url';
import { entities as defaultEntities, sources as defaultSources } from '../../config/intelligence-sources.mjs';

const ENTITY_TYPES = new Set(['lab', 'provider', 'model', 'harness', 'research_org', 'product']);
const ENTITY_STATUSES = new Set(['active', 'watchlist', 'archived']);
const TRANSPORT_TYPES = new Set(['rss', 'atom', 'sitemap', 'html']);
const ACTIVE_PARSER_KEYS = new Set(['rss', 'atom', 'sitemap']);
const SOURCE_ROLES = new Set(['newsroom', 'changelog', 'research', 'model_cards', 'documentation', 'releases']);
const SOURCE_TYPES = new Set(['rss_official', 'rss_unofficial', 'scraped']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function hasEmbeddedCredentials(value) {
  try {
    const url = new URL(value);
    return url.username !== '' || url.password !== '';
  } catch {
    return false;
  }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateManifest({ entities, sources }) {
  const errors = [];
  const warnings = [];
  const entityList = Array.isArray(entities) ? entities : [];
  const sourceList = Array.isArray(sources) ? sources : [];

  for (const slug of findDuplicates(entityList.map(({ slug }) => slug))) {
    errors.push(`duplicate entity slug ${slug}`);
  }
  for (const sourceKey of findDuplicates(sourceList.map(({ sourceKey }) => sourceKey))) {
    errors.push(`duplicate source key ${sourceKey}`);
  }

  for (const currentEntity of entityList) {
    if (!SLUG_PATTERN.test(currentEntity.slug ?? '')) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} must have a stable lowercase slug`);
    }
    if (typeof currentEntity.name !== 'string' || !currentEntity.name.trim()) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} must have a name`);
    }
    if (!ENTITY_TYPES.has(currentEntity.entityType)) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} has unsupported type ${currentEntity.entityType}`);
    }
    if (!ENTITY_STATUSES.has(currentEntity.status)) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} has unsupported status ${currentEntity.status}`);
    }
    if (!validHttpsUrl(currentEntity.homepageUrl)) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} homepageUrl must use HTTPS`);
    } else if (hasEmbeddedCredentials(currentEntity.homepageUrl)) {
      errors.push(`entity ${currentEntity.slug ?? '<missing>'} homepageUrl must use credential-free HTTPS`);
    }
  }

  const entitySlugs = new Set(entityList.map(({ slug }) => slug));
  for (const currentSource of sourceList) {
    const key = currentSource.sourceKey ?? '<missing>';
    if (!SLUG_PATTERN.test(currentSource.sourceKey ?? '')) {
      errors.push(`source ${key} must have a stable lowercase key`);
    }
    if (!entitySlugs.has(currentSource.entitySlug)) {
      errors.push(`source ${key} references missing entity ${currentSource.entitySlug}`);
    }
    if (typeof currentSource.name !== 'string' || !currentSource.name.trim()) {
      errors.push(`source ${key} must have a name`);
    }
    if (!validHttpsUrl(currentSource.officialUrl)) {
      errors.push(`source ${key} officialUrl must use HTTPS`);
    } else if (hasEmbeddedCredentials(currentSource.officialUrl)) {
      errors.push(`source ${key} officialUrl must use credential-free HTTPS`);
    }
    if (!validHttpsUrl(currentSource.endpointUrl)) {
      errors.push(`source ${key} endpointUrl must use HTTPS`);
    } else if (hasEmbeddedCredentials(currentSource.endpointUrl)) {
      errors.push(`source ${key} endpointUrl must use credential-free HTTPS`);
    }
    if (!TRANSPORT_TYPES.has(currentSource.transportType)) {
      errors.push(`source ${key} has unsupported transport ${currentSource.transportType}`);
    }
    if (!SOURCE_ROLES.has(currentSource.sourceRole)) {
      errors.push(`source ${key} has unsupported role ${currentSource.sourceRole}`);
    }
    if (!SOURCE_TYPES.has(currentSource.sourceType)) {
      errors.push(`source ${key} has unsupported source type ${currentSource.sourceType}`);
    }
    if (typeof currentSource.parserKey !== 'string' || !currentSource.parserKey.trim()) {
      errors.push(`source ${key} must have a parserKey`);
    }
    if (currentSource.active && !ACTIVE_PARSER_KEYS.has(currentSource.parserKey)) {
      errors.push(`active source ${key} has unsupported parser ${currentSource.parserKey}`);
    }
    if (currentSource.active && !validDate(currentSource.verifiedAt ?? '')) {
      errors.push(`source ${key} must have a valid verifiedAt date`);
    }
    if (currentSource.required && !currentSource.active) {
      errors.push(`source ${key} cannot be required while inactive`);
    }
    if (currentSource.archiveOnly && currentSource.active) {
      errors.push(`source ${key} cannot be archive-only while active`);
    }
    if (!Array.isArray(currentSource.includePaths)) {
      errors.push(`source ${key} includePaths must be an array`);
    }
    if (!Array.isArray(currentSource.allowedHosts)) {
      errors.push(`source ${key} allowedHosts must be an array`);
    } else {
      for (const host of currentSource.allowedHosts) {
        if (typeof host !== 'string' || !HOST_PATTERN.test(host)) {
          errors.push(`source ${key} allowed host ${String(host)} must be an exact lowercase hostname`);
        }
      }
    }
  }

  return { errors, warnings };
}

if (import.meta.main) {
  const result = validateManifest({ entities: defaultEntities, sources: defaultSources });
  if (result.errors.length) {
    for (const error of result.errors) globalThis.console.error(error);
    process.exitCode = 1;
  } else {
    const activeSources = defaultSources.filter(({ active }) => active).length;
    globalThis.console.log(`Validated ${defaultEntities.length} entities and ${activeSources} active sources.`);
  }
}
