import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Provide a clear, actionable error in development.
  const msg = `Missing Supabase environment variables.\n` +
    `Expected PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to be set in your .env file.\n` +
    `See .env.example for the required shape.`;
  if (import.meta.env?.DEV) {
    console.error(msg);
  }
  throw new Error('Supabase configuration error: PUBLIC_SUPABASE_URL and/or PUBLIC_SUPABASE_ANON_KEY are missing.');
}

export const supabase = createClient(url, anonKey);
