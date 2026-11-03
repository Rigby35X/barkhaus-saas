import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearCache } from '../lib/apiCache';
import { loadOrganizationAccess, type OrganizationAccess } from '../lib/organizationAccess';

interface Props {
  children: (access: OrganizationAccess, signOut: () => void) => ReactNode;
}

export default function SupabaseAccess({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationAccess[]>([]);
  const [accessForUser, setAccessForUser] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    let events = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      events++;
      clearCache();
      setSession(nextSession);
      setInitializing(false);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || events) return;
      setSession(sessionError ? null : data.session);
      if (sessionError) setError('Your sign-in could not be restored. Please sign in again.');
      setInitializing(false);
    }).catch(() => {
      if (active) {
        setError('Your sign-in could not be restored. Please sign in again.');
        setInitializing(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    let active = true;
    setMemberships([]);
    setAccessForUser(null);
    setSelectedOrgId(null);
    setError('');
    if (!userId) { setAccessLoading(false); return () => { active = false; }; }
    setAccessLoading(true);
    void loadOrganizationAccess(userId).then((access) => {
      if (!active) return;
      setMemberships(access);
      if (access.length === 1) setSelectedOrgId(access[0].orgId);
    }).catch(() => {
      if (active) setError('Could not verify your organization access. Please retry or sign out.');
    }).finally(() => { if (active) { setAccessForUser(userId); setAccessLoading(false); } });
    return () => { active = false; };
  }, [userId, retry]);

  const signOut = () => {
    void supabase.auth.signOut({ scope: 'local' }).then(({ error: signOutError }) => {
      if (signOutError) setError('Could not sign out. Please retry.');
      else {
        clearCache();
        localStorage.removeItem('barkhausAdminSession');
        localStorage.removeItem('barkhausAuthToken');
        setSession(null);
      }
    }).catch(() => setError('Could not sign out. Please retry.'));
  };

  const googleLogin = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (loginError) throw loginError;
    } catch {
      setError('Could not start Google sign-in. Please try again.');
      setSubmitting(false);
    }
  };

  const passwordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) throw loginError;
      setPassword('');
    } catch {
      setError('Sign-in failed. Check your email and password and try again.');
    } finally { setSubmitting(false); }
  };

  const selected = memberships.find((access) => access.orgId === selectedOrgId);
  if (!initializing && !accessLoading && session && accessForUser === userId && selected && !error) {
    return <>
      {memberships.length > 1 && <div className="bg-white border-b p-3 text-sm text-right">
        <label>Organization <select value={selectedOrgId ?? ''} onChange={(event) => setSelectedOrgId(Number(event.target.value))}>
          {memberships.map((access) => <option key={access.orgId} value={access.orgId}>{access.orgConfig.name}</option>)}
        </select></label>
      </div>}
      {children(selected, signOut)}
    </>;
  }

  return <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <h1 className="text-3xl font-serif font-bold text-deep-taupe text-center">BarkHaus</h1>
      <p className="text-stone mt-2 mb-6 text-center">Your rescue, all in one place.</p>
      {initializing || accessLoading || (session && accessForUser !== userId) ? <p role="status">Loading your account…</p> : session ? <>
        {error ? <p role="alert" className="text-red-600 mb-4">{error}</p> : memberships.length > 1 ? <>
          <h2 className="font-semibold mb-3">Choose your organization</h2>
          {memberships.map((access) => <button key={access.orgId} className="block w-full border rounded-xl p-3 mb-2 text-left"
            onClick={() => setSelectedOrgId(access.orgId)}>{access.orgConfig.name}</button>)}
        </> : <p className="mb-4">You are signed in as {session.user.email}, but your account has no owner or admin membership. Ask your organization owner to grant access.</p>}
        <button onClick={() => setRetry((value) => value + 1)} className="mr-4 underline">Retry access check</button>
        <button onClick={signOut} className="underline">Sign out</button>
      </> : <>
        <h2 className="text-xl font-serif font-semibold mb-4">Welcome back</h2>
        {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}
        <button type="button" disabled={submitting} onClick={() => void googleLogin()}
          className="w-full border border-warm-brown rounded-xl py-3 mb-5 disabled:opacity-50">Continue with Google</button>
        <p className="text-center text-sm text-stone mb-4">or use your email</p>
        <form onSubmit={(event) => void passwordLogin(event)} className="space-y-4">
          <label className="block text-sm">Email
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}
              className="block w-full border rounded-xl px-4 py-3 mt-1" />
          </label>
          <label className="block text-sm">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}
              className="block w-full border rounded-xl px-4 py-3 mt-1" />
          </label>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-warm-brown text-white rounded-xl disabled:opacity-50">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a href="https://barkhaus.io/forgot-password" className="block mt-4 text-sm underline">Forgot password?</a>
      </>}
    </div>
  </div>;
}
