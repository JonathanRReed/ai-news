import { describe, expect, test } from 'bun:test';
import { entities, sources } from '../../config/intelligence-sources.mjs';
import { renderCatalogJson, renderSeedSql } from './generate-seed.mjs';

describe('renderSeedSql', () => {
  test('renders every manifest entity and source deterministically', () => {
    const manifest = { entities, sources };
    const first = renderSeedSql(manifest);
    const second = renderSeedSql(manifest);

    expect(first).toBe(second);
    expect(first).toContain(`-- entities: ${entities.length}`);
    expect(first).toContain(`-- sources: ${sources.length}`);
    expect(first).toContain('on conflict (slug) do update set');
    expect(first).toContain('on conflict (source_key) do update set');
    for (const source of sources) expect(first).toContain(source.sourceKey);
  });

  test('renders a deterministic public catalog from the same authority', () => {
    const catalog = JSON.parse(renderCatalogJson({ entities, sources }));
    expect(catalog.entities).toHaveLength(entities.length);
    expect(catalog.sources).toHaveLength(sources.length);
    expect(catalog.sources.every(({ allowedHosts }) => Array.isArray(allowedHosts))).toBe(true);
    expect(catalog.entities.find(({ slug }) => slug === 'openclaw')).toMatchObject({
      name: 'OpenClaw',
      entityType: 'harness',
    });
  });
});
