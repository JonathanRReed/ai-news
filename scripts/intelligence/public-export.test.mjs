import { describe, expect, test } from 'bun:test';
import { discoverPublicSupabaseConfig, fetchAllLegacyRows } from './public-export.mjs';

describe('public Supabase export', () => {
  test('discovers public configuration without including the credential in receipts', async () => {
    const fetchImpl = async (url) => {
      if (url === 'https://news.example/') {
        return new Response('<script src="/assets/app.js"></script>');
      }
      return new Response(
        'const url="https://project-ref.supabase.co";const key="sb_publishable_publictest";',
      );
    };

    const config = await discoverPublicSupabaseConfig('https://news.example/', fetchImpl);
    expect(config.url).toBe('https://project-ref.supabase.co');
    expect(config.credential).toBe('sb_publishable_publictest');
    expect(config.receipt).toEqual({
      projectRef: 'project-ref',
      credentialKind: 'publishable',
      assetCount: 1,
    });
    expect(JSON.stringify(config.receipt)).not.toContain(config.credential);
  });

  test('does not request cross-origin script assets discovered in the page', async () => {
    const requested = [];
    const fetchImpl = async (url) => {
      requested.push(String(url));
      if (url === 'https://news.example/') {
        return new Response([
          '<script src="https://attacker.example/steal.js"></script>',
          '<script src="/assets/app.js"></script>',
        ].join(''));
      }
      return new Response(
        'const url="https://project-ref.supabase.co";const key="sb_publishable_publictest";',
      );
    };

    await discoverPublicSupabaseConfig('https://news.example/', fetchImpl);
    expect(requested).toEqual([
      'https://news.example/',
      'https://news.example/assets/app.js',
    ]);
  });

  test('blocks an off-origin redirect before requesting its target', async () => {
    const requested = [];
    const fetchImpl = async (url) => {
      requested.push(String(url));
      return new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/' },
      });
    };

    await expect(discoverPublicSupabaseConfig('https://news.example/', fetchImpl))
      .rejects.toThrow('source URL is outside declared HTTPS hosts');
    expect(requested).toEqual(['https://news.example/']);
  });

  test('rejects an oversized discovery page', async () => {
    await expect(discoverPublicSupabaseConfig(
      'https://news.example/',
      async () => new Response('ok', { headers: { 'content-length': String(3 * 1024 * 1024) } }),
    )).rejects.toThrow('source response exceeded size limit');
  });

  test('fetches every row with bounded range requests', async () => {
    const calls = [];
    const fetchImpl = async (_url, options = {}) => {
      calls.push(options);
      if (options.method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'content-range': '0-0/3' } });
      }
      const start = Number((options.headers.Range ?? '0-0').split('-')[0]);
      const page = start === 0 ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'c' }];
      return Response.json(page);
    };

    const rows = await fetchAllLegacyRows({
      url: 'https://project-ref.supabase.co',
      credential: 'sb_publishable_publictest',
      fetchImpl,
      pageSize: 2,
    });

    expect(rows.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(calls.filter(({ method }) => method !== 'HEAD')).toHaveLength(2);
  });

  test('does not forward the public credential across a redirect', async () => {
    const calls = [];
    await expect(fetchAllLegacyRows({
      url: 'https://project-ref.supabase.co',
      credential: 'sb_publishable_publictest',
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return new Response(null, {
          status: 302,
          headers: { location: 'https://attacker.example/collect' },
        });
      },
    })).rejects.toThrow('URL is outside the configured origin');
    expect(calls).toHaveLength(1);
    expect(calls[0].options.redirect).toBe('manual');
  });

  test('rejects oversized export pages and implausible row counts', async () => {
    let call = 0;
    await expect(fetchAllLegacyRows({
      url: 'https://project-ref.supabase.co',
      credential: 'sb_publishable_publictest',
      fetchImpl: async () => {
        call += 1;
        if (call === 1) {
          return new Response(null, { headers: { 'content-range': '0-0/1' } });
        }
        return new Response('[]', {
          headers: { 'content-length': String(32 * 1024 * 1024) },
        });
      },
    })).rejects.toThrow('source response exceeded size limit');

    await expect(fetchAllLegacyRows({
      url: 'https://project-ref.supabase.co',
      credential: 'sb_publishable_publictest',
      fetchImpl: async () => new Response(null, {
        headers: { 'content-range': '0-0/100001' },
      }),
    })).rejects.toThrow('public export row count exceeds safety limit');
  });
});
