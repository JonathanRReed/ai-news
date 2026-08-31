import { describe, expect, test } from 'bun:test';
import { createAdminClient } from './supabase-rest.mjs';

const serviceRoleKey = 'service-role-secret-for-tests';

describe('createAdminClient', () => {
  test('batches upserts and sends the service credential only in headers', async () => {
    const calls = [];
    const client = createAdminClient({
      url: 'https://example.supabase.co',
      serviceRoleKey,
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response('', { status: 201 });
      },
    });

    await client.upsertRows(
      'content_items',
      Array.from({ length: 501 }, (_, index) => ({ id: `${index}` })),
      { onConflict: 'canonical_url' },
    );

    expect(calls).toHaveLength(3);
    expect(calls.map(({ options }) => JSON.parse(options.body).length)).toEqual([250, 250, 1]);
    expect(calls[0].url).toBe(
      'https://example.supabase.co/rest/v1/content_items?on_conflict=canonical_url',
    );
    expect(calls[0].options.headers.authorization).toBe(`Bearer ${serviceRoleKey}`);
    expect(calls[0].options.headers.prefer).toBe('resolution=merge-duplicates,return=minimal');
    expect(calls[0].url).not.toContain(serviceRoleKey);
  });

  test('never includes a service credential in thrown errors', async () => {
    const client = createAdminClient({
      url: 'https://example.supabase.co',
      serviceRoleKey,
      fetchImpl: async () => new Response(`database said ${serviceRoleKey}`, { status: 500 }),
    });

    let message = '';
    try {
      await client.selectRows('sources', { select: 'id' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('HTTP 500');
    expect(message).not.toContain(serviceRoleKey);
  });

  test('supports service-role RPC calls without exposing the key in the payload', async () => {
    let call;
    const client = createAdminClient({
      url: 'https://example.supabase.co/',
      serviceRoleKey,
      fetchImpl: async (url, options) => {
        call = { url, options };
        return Response.json('run-id');
      },
    });

    const result = await client.rpc('start_intelligence_ingestion', {
      p_trigger_source: 'manual',
      p_source_count: 2,
    });

    expect(result).toBe('run-id');
    expect(call.url).toBe(
      'https://example.supabase.co/rest/v1/rpc/start_intelligence_ingestion',
    );
    expect(call.options.body).not.toContain(serviceRoleKey);
  });

  test('blocks a cross-origin redirect before forwarding the service credential', async () => {
    const calls = [];
    const client = createAdminClient({
      url: 'https://example.supabase.co',
      serviceRoleKey,
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return new Response(null, {
          status: 302,
          headers: { location: 'https://attacker.example/collect' },
        });
      },
    });

    await expect(client.selectRows('sources', { select: 'id' }))
      .rejects.toThrow('Supabase network request failed');
    expect(calls).toHaveLength(1);
    expect(calls[0].options.redirect).toBe('manual');
  });

  test('rejects an oversized successful response before JSON parsing', async () => {
    const client = createAdminClient({
      url: 'https://example.supabase.co',
      serviceRoleKey,
      fetchImpl: async () => new Response('[]', {
        headers: { 'content-length': String(32 * 1024 * 1024) },
      }),
    });

    await expect(client.selectRows('sources', { select: 'id' }))
      .rejects.toThrow('Supabase response exceeded size limit');
  });
});
