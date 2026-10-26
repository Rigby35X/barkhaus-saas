import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);

// An inert local URL lets the app show a configuration error without crashing.
// The login screen blocks requests until both deployment values exist.
export const supabase = createClient(url || 'http://127.0.0.1:54321', key || 'unconfigured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
