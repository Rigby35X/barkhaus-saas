import { supabase } from './supabase';

/** Client session token only; each API independently verifies Auth and membership. */
export async function platformAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Please sign in again.');
  return data.session.access_token;
}
