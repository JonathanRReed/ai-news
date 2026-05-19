import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();
export const hasSupabaseConfig = Boolean(url && anonKey);

if (!hasSupabaseConfig) {
  // Provide a clear, actionable error in development.
  const msg = `Missing Supabase environment variables.\n` +
    `Expected PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to be set in your .env file.\n` +
    `See .env.example for the required shape.`;
  if (import.meta.env?.DEV) {
    console.error(msg);
  }
}

export const supabase = hasSupabaseConfig ? createClient<Database>(url, anonKey) : null;
