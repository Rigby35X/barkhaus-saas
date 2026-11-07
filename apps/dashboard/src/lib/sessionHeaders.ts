import { supabase } from './supabase';
export async function sessionHeaders(): Promise<Record<string,string>> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please sign in again.');
  return { Authorization: `Bearer ${data.session.access_token}` };
}
