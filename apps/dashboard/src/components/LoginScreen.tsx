import { useState, type FormEvent } from 'react';
import { login } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured || loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Unable to sign in. Check your email and password, then try again.');
    } finally {
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
          <div><label htmlFor="login-email" className="block text-sm font-semibold text-deep-taupe mb-1">Email</label><input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown" /></div>
          <div><label htmlFor="login-password" className="block text-sm font-semibold text-deep-taupe mb-1">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown" /></div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={loading || !isSupabaseConfigured} className="w-full py-3 bg-warm-brown text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
