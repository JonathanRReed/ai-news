/* global AbortController, AbortSignal */
import { SUPABASE_REST_HEADERS, SUPABASE_URL } from './supabaseClient.js';

export async function fetchSourceHealth(params: URLSearchParams, signal: AbortSignal, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/intelligence_source_health_v1?${params}`, {
      headers: SUPABASE_REST_HEADERS,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source health responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
