// We only ever do anonymous PostgREST reads, so we skip the full @supabase/supabase-js
// SDK (realtime + auth + storage, ~210 KB) and hit the REST endpoint directly with fetch.
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  const msg =
    `Missing Supabase environment variables.\n` +
    `Expected PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to be set in your .env file.\n` +
    `AI News Hub will use the checked-in provider cache until live feed credentials are available.`;
  if (import.meta.env?.DEV) {
    console.warn(msg);
  }
}

export const SUPABASE_URL = url ?? "";
export const SUPABASE_ANON_KEY = anonKey ?? "";
export const supabaseConfigured = Boolean(url && anonKey);
export const SUPABASE_REST_HEADERS: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};
