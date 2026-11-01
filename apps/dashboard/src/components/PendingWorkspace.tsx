import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { acceptInvitation } from '../features/identity/recovery';
import type { SignupIntent } from '../features/identity/signup';

export default function PendingWorkspace({intent,onRetry,onLogout}:{intent:SignupIntent|null;onRetry():void;onLogout():void}) {
  const [token,setToken] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function join(event:FormEvent) {
    event.preventDefault(); if(busy)return;
    setBusy(true);setError('');
    try { await acceptInvitation(supabase,token.trim());setToken('');onRetry(); }
    catch { setError('This invitation could not be accepted. Ask your organization for a new invitation.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-cloud flex items-center justify-center p-6">
    <section className="max-w-md bg-white rounded-2xl border border-silver-gray p-8 space-y-4">
      <h1 className="font-serif text-2xl text-deep-taupe">Welcome to BarkHaus</h1>
      <p>You’re signed in. Your organization workspace hasn’t been set up yet.</p>
      {intent && <p>Selected plan: {intent.plan === 'pro' ? 'Pro' : intent.plan === 'growth' ? 'Growth' : 'Starter'} · {intent.billing === 'paid' ? 'Paid plan requested' : 'Trial requested'}.</p>}
      <p>No subscription has been activated and no payment has been taken.</p>
      <a className="block underline text-warm-brown" href="mailto:hello@barkhaus.io?subject=BarkHaus%20organization%20setup">Contact us to set up your organization</a>
      <form onSubmit={event=>void join(event)} className="space-y-2">
        <label className="block">Have an organization invitation?<input aria-label="Organization invitation token" className="block w-full border rounded p-2" value={token} onChange={event=>setToken(event.target.value)} autoComplete="off" /></label>
        <button disabled={busy || !token.trim()}>{busy ? 'Joining…' : 'Accept invitation'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button onClick={onRetry}>Refresh access</button>{' '}<button onClick={onLogout}>Sign out</button>
    </section>
  </main>;
}
