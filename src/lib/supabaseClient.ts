import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  const msg = `Missing Supabase environment variables.\n` +
    `Expected PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to be set in your .env file.\n` +
    `AI News Hub will use the checked-in provider cache until live feed credentials are available.`;
  if (import.meta.env?.DEV) {
    console.warn(msg);
  }
}

export const supabase = url && anonKey ? createClient<Database>(url, anonKey) : null;
