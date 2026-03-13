import { useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const getEnv = () => (import.meta as unknown as { env: Record<string, string> }).env;
const APP_URL = () => getEnv().PUBLIC_APP_URL ?? 'https://app.barkhaus.io';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      getEnv().PUBLIC_SUPABASE_URL ?? '',
      getEnv().PUBLIC_SUPABASE_ANON_KEY ?? ''
    );
  }
  return _supabase;
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid')) {
          setError('Invalid email or password.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = APP_URL();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Welcome Back</h2>
        <p className="text-stone">Sign in to your Barkhaus account.</p>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 border border-silver-gray rounded-xl text-sm font-semibold text-deep-taupe hover:bg-cloud transition mb-4 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-silver-gray" />
        <span className="text-xs text-stone">or</span>
        <div className="flex-1 h-px bg-silver-gray" />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@happypaws.org"
            required
            className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-stone uppercase tracking-wider">Password</label>
            <a href="/forgot-password" className="text-xs text-warm-brown hover:underline">
              Forgot password?
            </a>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Signing In…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-stone pt-2">
          Don't have an account?{' '}
          <a href="/signup" className="text-warm-brown font-semibold hover:underline">
            Start Free Trial
          </a>
        </p>
      </form>
    </div>
  );
}
