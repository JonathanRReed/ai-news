import { describe, expect, test } from 'bun:test';
import {
  admittedExactOriginUrl,
  admittedHttpsUrl,
  fetchAdmittedResponse,
  fetchExactOriginResponse,
  readBoundedText,
} from './source-policy.mjs';

const source = {
  sourceKey: 'example-feed',
  officialUrl: 'https://example.com/news',
  endpointUrl: 'https://feeds.example.com/index.xml',
  allowedHosts: ['cdn.example.com'],
};

describe('source URL policy', () => {
  test('admits only exact declared HTTPS hosts without embedded credentials', () => {
    expect(admittedHttpsUrl(source, 'https://example.com/release').hostname).toBe('example.com');
    expect(admittedHttpsUrl(source, 'https://feeds.example.com/next.xml').hostname).toBe('feeds.example.com');
    expect(admittedHttpsUrl(source, 'https://cdn.example.com/item').hostname).toBe('cdn.example.com');

    for (const value of [
      'http://example.com/release',
      'https://example.com.evil.test/release',
      'https://user:password@example.com/release',
      'data:text/plain,hello',
    ]) {
      expect(() => admittedHttpsUrl(source, value)).toThrow('source URL is outside declared HTTPS hosts');
    }
  });

  test('blocks an off-host redirect before issuing the redirected request', async () => {
    const requested = [];
    const fetchImpl = async (url, options) => {
      requested.push(String(url));
      expect(options.redirect).toBe('manual');
      return new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/payload.xml' },
      });
    };

    await expect(fetchAdmittedResponse(
      source,
      source.endpointUrl,
      { fetchImpl },
    )).rejects.toThrow('source URL is outside declared HTTPS hosts');
    expect(requested).toEqual([source.endpointUrl]);
  });

  test('follows a short admitted redirect chain with manual redirects', async () => {
    const requested = [];
    const fetchImpl = async (url) => {
      requested.push(String(url));
      if (requested.length === 1) {
        return new Response(null, {
          status: 307,
          headers: { location: '/current.xml' },
        });
      }
      return new Response('<rss />', { status: 200 });
    };

    const response = await fetchAdmittedResponse(source, source.endpointUrl, { fetchImpl });
    expect(response.status).toBe(200);
    expect(requested).toEqual([
      'https://feeds.example.com/index.xml',
      'https://feeds.example.com/current.xml',
    ]);
  });
});

describe('exact origin policy', () => {
  test('allows HTTPS and loopback HTTP only on the configured origin', () => {
    expect(admittedExactOriginUrl(
      'https://project.supabase.co',
      'https://project.supabase.co/rest/v1/items',
    ).pathname).toBe('/rest/v1/items');
    expect(admittedExactOriginUrl(
      'http://127.0.0.1:54321',
      '/rest/v1/items',
    ).origin).toBe('http://127.0.0.1:54321');
    expect(() => admittedExactOriginUrl(
      'https://project.supabase.co',
      'https://attacker.example/rest/v1/items',
    )).toThrow('URL is outside the configured origin');
    expect(() => admittedExactOriginUrl(
      'http://project.supabase.co',
      '/rest/v1/items',
    )).toThrow('configured origin must use HTTPS or loopback HTTP');
  });

  test('does not forward headers across an off-origin redirect', async () => {
    const calls = [];
    await expect(fetchExactOriginResponse(
      'https://project.supabase.co',
      '/rest/v1/items',
      {
        headers: { apikey: 'server-secret' },
        fetchImpl: async (url, options) => {
          calls.push({ url: String(url), options });
          return new Response(null, {
            status: 302,
            headers: { location: 'https://attacker.example/collect' },
          });
        },
      },
    )).rejects.toThrow('URL is outside the configured origin');
    expect(calls).toHaveLength(1);
    expect(calls[0].options.redirect).toBe('manual');
  });
});

describe('bounded response reader', () => {
  test('rejects a streamed body once it exceeds the byte cap', async () => {
    const response = new Response('abcdef');
    await expect(readBoundedText(response, 5)).rejects.toThrow('source response exceeded size limit');
  });

  test('rejects an oversized declared content length without reading the body', async () => {
    const response = new Response('ok', { headers: { 'content-length': '100' } });
    await expect(readBoundedText(response, 10)).rejects.toThrow('source response exceeded size limit');
  });
});
