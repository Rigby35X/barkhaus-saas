import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { RECOVERY_PENDING, requestRecovery, finishRecovery, acceptInvitation } from '../features/identity/recovery';
import { login } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'request' | 'reset'>(() => sessionStorage.getItem(RECOVERY_PENDING) === 'true' ? 'reset' : 'login');
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState('');
  useEffect(() => {
    const onRecovery = () => setMode('reset');
    window.addEventListener('barkhaus-recovery', onRecovery);
    return () => window.removeEventListener('barkhaus-recovery', onRecovery);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured || loading) return;
    setError('');
    setLoading(true);
    let invitationAccepted = false;
    try {
      if (mode === 'request') {
        await requestRecovery(supabase, email, window.location.origin);
        setMessage('If this address has an account, a recovery email will arrive shortly.');
      } else if (mode === 'reset') {
        await finishRecovery(supabase, password);
        sessionStorage.removeItem(RECOVERY_PENDING);
        setPassword(''); setMode('login'); setMessage('Password updated. Sign in with your new password.');
      } else {
        if (invitation) sessionStorage.setItem('barkhausInvitationPending', 'true');
        await login(email, password);
        if (invitation) { await acceptInvitation(supabase, invitation); invitationAccepted = true; }
      }
    } catch {
      if (invitation && mode === 'login') await supabase.auth.signOut();
      setError('Unable to complete this request. Check your details or request a new link.');
    } finally {
      sessionStorage.removeItem('barkhausInvitationPending');
      if (invitationAccepted) window.dispatchEvent(new Event('focus'));
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-serif font-bold text-deep-taupe">Welcome to BarkHaus</h1>
        <p className="text-stone mt-2 mb-8">Sign in to your rescue workspace.</p>
        {!isSupabaseConfigured && <p role="alert" className="text-sm text-red-600 mb-4">Sign-in is not configured for this deployment. Contact your administrator.</p>}
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {mode !== 'reset' && <div><label htmlFor="login-email" className="block text-sm font-semibold text-deep-taupe mb-1">Email</label><input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown" /></div>}
          {mode !== 'request' && <div><label htmlFor="login-password" className="block text-sm font-semibold text-deep-taupe mb-1">Password</label><input id="login-password" name="password" type="password" minLength={mode === 'reset' ? 12 : undefined} autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown" /></div>}
          {mode === 'login' && <label className="block text-sm">Invitation token (optional)<input aria-label="Invitation token" value={invitation} onChange={e => setInvitation(e.target.value)} className="w-full border rounded px-3 py-2" /></label>}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={loading || !isSupabaseConfigured} className="w-full py-3 bg-warm-brown text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">{loading ? 'Please wait…' : mode === 'request' ? 'Send recovery email' : mode === 'reset' ? 'Set new password' : 'Sign in'}</button>
        </form>
        {mode === 'reset' && <button type="button" className="mt-4 text-sm underline" onClick={() => { void supabase.auth.signOut().then(() => { sessionStorage.removeItem(RECOVERY_PENDING); setMode('request'); setPassword(''); }); }}>Request a new recovery link</button>}
        {mode !== 'reset' && <button type="button" className="mt-4 text-sm underline" onClick={() => { setError(''); setMessage(''); setMode(mode === 'request' ? 'login' : 'request'); }}>{mode === 'request' ? 'Back to sign in' : 'Forgot password?'}</button>}
      </div>
    </div>
  );
}
