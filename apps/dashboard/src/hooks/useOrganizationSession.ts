import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clearLegacySession, loadOrganizationAccess } from '../lib/auth';
import { clearCache } from '../lib/apiCache';
import type { OrganizationAccess } from '../lib/access';

export function useOrganizationSession() {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<OrganizationAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    clearLegacySession();
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const request = ++generation;
      clearCache();
      setAccess([]);
      setLoading(true);
      setError('');
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (disposed || request !== generation) return;
        setUser(data.session?.user ?? null);
        const memberships = data.session ? await loadOrganizationAccess() : [];
        if (!disposed && request === generation) setAccess(memberships);
      } catch (err) {
        if (!disposed && request === generation) setError(err instanceof Error ? err.message : 'Unable to load your account.');
      } finally {
        if (!disposed && request === generation) setLoading(false);
      }
    };
    // Do not await Supabase requests inside the Auth callback (the SDK holds a lock).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        ++generation;
        clearCache();
        setUser(null);
        setAccess([]);
        setError('');
        setLoading(false);
      } else if (event !== 'TOKEN_REFRESHED') {
        clearTimeout(timer);
        timer = setTimeout(() => { void refresh(); }, 0);
      }
    });
    void refresh();
    // Recheck membership revocation/role changes when returning to the workspace.
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      ++generation;
      clearTimeout(timer);
      data.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [revision]);

  return { user, access, loading, error, retry: () => setRevision((value) => value + 1) };
}
