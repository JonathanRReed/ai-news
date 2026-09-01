import { describe, expect, test } from 'bun:test';
import { entities, entityBySlug, sources } from '../../config/intelligence-sources.mjs';
import { validateManifest } from './validate-manifest.mjs';

const requiredProviderSlugs = [
  'openai',
  'anthropic',
  'google-deepmind',
  'meta-ai',
  'xai',
  'mistral-ai',
  'hugging-face',
  'deepseek',
  'alibaba-qwen',
  'amazon-ai',
  'nvidia-ai',
  'ibm-research',
  'z-ai',
  'moonshot-ai',
  'minimax',
  'tencent-hunyuan',
  'stepfun',
];

const requiredHarnessSlugs = [
  'hermes-agent',
  'openclaw',
  'openhands',
  'aider',
  'cline',
  'roo-code',
  'goose',
  'continue',
  'letta',
  'codex-cli',
  'claude-code',
  'gemini-cli',
];

describe('intelligence source manifest', () => {
  test('passes the admission contract', () => {
    expect(validateManifest({ entities, sources })).toEqual({ errors: [], warnings: [] });
  });

  test('covers the approved provider and harness launch set', () => {
    const slugs = new Set(entities.map(({ slug }) => slug));

    for (const slug of [...requiredProviderSlugs, ...requiredHarnessSlugs]) {
      expect(slugs.has(slug)).toBe(true);
    }
    expect(sources.some(({ entitySlug }) => entitySlug === 'z-ai')).toBe(true);
    expect(sources.some(({ entitySlug }) => entitySlug === 'moonshot-ai')).toBe(true);
    expect(sources.some(({ entitySlug }) => entitySlug === 'hermes-agent')).toBe(true);
    expect(sources.some(({ entitySlug }) => entitySlug === 'openclaw')).toBe(true);
  });

  test('resolves entities by stable slug', () => {
    expect(entityBySlug('hermes-agent')).toMatchObject({
      name: 'Hermes Agent',
      entityType: 'harness',
      homepageUrl: 'https://github.com/NousResearch/hermes-agent',
      status: 'active',
    });
    expect(sources.find(({ sourceKey }) => sourceKey === 'hermes-agent-releases')).toMatchObject({
      officialUrl: 'https://github.com/NousResearch/hermes-agent',
      endpointUrl: 'https://github.com/NousResearch/hermes-agent/releases.atom',
    });
    expect(entityBySlug('openclaw')).toMatchObject({
      name: 'OpenClaw',
      entityType: 'harness',
      status: 'active',
    });
    expect(entityBySlug('does-not-exist')).toBeUndefined();
  });

  test('labels sitemap and HTML discovery as scraped provenance', () => {
    const discoveredPages = sources.filter(({ transportType }) => (
      transportType === 'sitemap' || transportType === 'html'
    ));
    expect(discoveredPages.length).toBeGreaterThan(0);
    expect(discoveredPages.every(({ sourceType }) => sourceType === 'scraped')).toBe(true);
  });
});

describe('validateManifest', () => {
  test('rejects a source whose entity is missing', () => {
    const result = validateManifest({
      entities: [],
      sources: [{
        sourceKey: 'openclaw-releases',
        entitySlug: 'openclaw',
        name: 'OpenClaw releases',
        officialUrl: 'https://github.com/openclaw/openclaw',
        endpointUrl: 'https://github.com/openclaw/openclaw/releases.atom',
        transportType: 'atom',
        sourceRole: 'releases',
        parserKey: 'atom',
        sourceType: 'rss_official',
        active: true,
        required: false,
        verifiedAt: '2026-08-30',
      }],
    });

    expect(result.errors).toContain(
      'source openclaw-releases references missing entity openclaw',
    );
  });

  test('rejects duplicate keys, insecure endpoints, and unverified active sources', () => {
    const entity = {
      slug: 'example',
      name: 'Example',
      entityType: 'provider',
      status: 'active',
      homepageUrl: 'https://example.com',
    };
    const invalidSource = {
      sourceKey: 'example-news',
      entitySlug: 'example',
      name: 'Example news',
      officialUrl: 'https://example.com/news',
      endpointUrl: 'http://example.com/feed.xml',
      transportType: 'rss',
      sourceRole: 'newsroom',
      parserKey: 'rss',
      sourceType: 'rss_official',
      active: true,
      required: true,
      verifiedAt: '',
    };

    const result = validateManifest({
      entities: [entity, entity],
      sources: [invalidSource, invalidSource],
    });

    expect(result.errors).toContain('duplicate entity slug example');
    expect(result.errors).toContain('duplicate source key example-news');
    expect(result.errors).toContain('source example-news endpointUrl must use HTTPS');
    expect(result.errors).toContain('source example-news must have a valid verifiedAt date');
  });

  test('rejects malformed explicit host admissions', () => {
    const entity = {
      slug: 'example',
      name: 'Example',
      entityType: 'provider',
      status: 'active',
      homepageUrl: 'https://example.com',
    };
    const base = {
      sourceKey: 'example-news',
      entitySlug: 'example',
      name: 'Example news',
      officialUrl: 'https://example.com/news',
      endpointUrl: 'https://example.com/feed.xml',
      transportType: 'rss',
      sourceRole: 'newsroom',
      parserKey: 'rss',
      sourceType: 'rss_official',
      active: true,
      required: false,
      verifiedAt: '2026-08-30',
      includePaths: [],
    };

    expect(validateManifest({
      entities: [entity],
      sources: [{ ...base, allowedHosts: 'cdn.example.com' }],
    }).errors).toContain('source example-news allowedHosts must be an array');
    expect(validateManifest({
      entities: [entity],
      sources: [{ ...base, allowedHosts: ['https://cdn.example.com', 'EXAMPLE.com', 'bad host'] }],
    }).errors).toEqual(expect.arrayContaining([
      'source example-news allowed host https://cdn.example.com must be an exact lowercase hostname',
      'source example-news allowed host EXAMPLE.com must be an exact lowercase hostname',
      'source example-news allowed host bad host must be an exact lowercase hostname',
    ]));
  });

  test('rejects credentials embedded in every public manifest URL', () => {
    const entity = {
      slug: 'example',
      name: 'Example',
      entityType: 'provider',
      status: 'active',
      homepageUrl: 'https://user:secret@example.com',
    };
    const source = {
      sourceKey: 'example-news',
      entitySlug: 'example',
      name: 'Example news',
      officialUrl: 'https://user:secret@example.com/news',
      endpointUrl: 'https://user:secret@example.com/feed.xml',
      transportType: 'rss',
      sourceRole: 'newsroom',
      parserKey: 'rss',
      sourceType: 'rss_official',
      active: true,
      required: false,
      verifiedAt: '2026-08-30',
      includePaths: [],
      allowedHosts: [],
    };

    expect(validateManifest({ entities: [entity], sources: [source] }).errors).toEqual(
      expect.arrayContaining([
        'entity example homepageUrl must use credential-free HTTPS',
        'source example-news officialUrl must use credential-free HTTPS',
        'source example-news endpointUrl must use credential-free HTTPS',
      ]),
    );
  });
});
