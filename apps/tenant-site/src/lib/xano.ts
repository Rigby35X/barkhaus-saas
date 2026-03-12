import { supabase } from './supabase';

export async function saveLinkedAccountToXano(payload: any) {
  const { data, error } = await supabase
    .from('linked_accounts')
    .upsert({ ...payload, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return data;
}
