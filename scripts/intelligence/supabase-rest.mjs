import {
  fetchExactOriginResponse,
  readBoundedText,
  SourceResponseSizeError,
} from './source-policy.mjs';

const MAX_BATCH_SIZE = 250;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

function requireIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SQL identifier`);
  }
  return value;
}

function requireUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Supabase URL must be a valid HTTP or HTTPS URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Supabase URL must be a credential-free HTTP or HTTPS URL');
  }
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function requireServiceRoleKey(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('A server-only Supabase service role key is required');
  }
  return value.trim();
}

function batches(rows, batchSize) {
  const output = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    output.push(rows.slice(index, index + batchSize));
  }
  return output;
}

async function parseSuccessfulResponse(response) {
  if (response.status === 204) return null;
  const body = await readBoundedText(response, MAX_RESPONSE_BYTES);
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function createAdminClient({ url, serviceRoleKey, fetchImpl = globalThis.fetch }) {
  const baseUrl = requireUrl(url);
  const credential = requireServiceRoleKey(serviceRoleKey);
  if (typeof fetchImpl !== 'function') throw new Error('Network fetch is unavailable');

  const headers = {
    apikey: credential,
    authorization: `Bearer ${credential}`,
    'content-type': 'application/json',
  };

  async function request(path, options = {}) {
    const target = new URL(path, baseUrl);
    try {
      const response = await fetchExactOriginResponse(baseUrl, target, {
        fetchImpl,
        method: options.method,
        headers: { ...headers, ...options.headers },
        body: options.body,
        signal: options.signal ?? globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        maxRedirects: 0,
      });
      if (!response.ok) {
        throw new Error(`Supabase request failed with HTTP ${response.status}`);
      }
      return await parseSuccessfulResponse(response);
    } catch (error) {
      if (error instanceof SourceResponseSizeError) {
        throw new Error('Supabase response exceeded size limit');
      }
      if (error instanceof Error && error.message.startsWith('Supabase request failed with HTTP')) {
        throw error;
      }
      throw new Error('Supabase network request failed');
    }
  }

  return {
    async selectRows(table, query = {}) {
      const target = new URL(`/rest/v1/${requireIdentifier(table, 'table')}`, baseUrl);
      for (const [key, value] of Object.entries(query)) {
        if (value !== null && value !== undefined) target.searchParams.set(key, String(value));
      }
      const result = await request(`${target.pathname}${target.search}`, { method: 'GET' });
      return Array.isArray(result) ? result : [];
    },

    async upsertRows(table, rows, options = {}) {
      if (!Array.isArray(rows)) throw new Error('upsert rows must be an array');
      if (!rows.length) return;
      const batchSize = Math.min(Math.max(options.batchSize ?? MAX_BATCH_SIZE, 1), MAX_BATCH_SIZE);
      const target = new URL(`/rest/v1/${requireIdentifier(table, 'table')}`, baseUrl);
      if (options.onConflict) target.searchParams.set('on_conflict', options.onConflict);
      for (const batch of batches(rows, batchSize)) {
        await request(`${target.pathname}${target.search}`, {
          method: 'POST',
          headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(batch),
        });
      }
    },

    async patchRows(table, filters, values) {
      const target = new URL(`/rest/v1/${requireIdentifier(table, 'table')}`, baseUrl);
      for (const [key, value] of Object.entries(filters ?? {})) {
        target.searchParams.set(key, String(value));
      }
      await request(`${target.pathname}${target.search}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify(values),
      });
    },

    async rpc(name, body = {}) {
      const functionName = requireIdentifier(name, 'RPC name');
      return request(`/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  };
}
