import { useState, type FormEvent } from 'react';

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env)
  ? ((import.meta as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? '')
  : '';
const APP_URL = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env)
  ? ((import.meta as { env: Record<string, string> }).env.VITE_APP_URL ?? 'https://app.barkhaus.io')
  : 'https://app.barkhaus.io';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 401) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Login failed. Please try again.');
      }

      const data = await res.json() as { authToken?: string; token?: string };
      const authToken = data.authToken ?? data.token ?? '';
      if (authToken) localStorage.setItem('barkhausAuthToken', authToken);
      window.location.href = `${APP_URL}${authToken ? `?token=${encodeURIComponent(authToken)}` : ''}`;
    } catch (err) {
      if ((err as Error).message !== 'Invalid email or password.') {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Welcome back</h2>
        <p className="text-stone">Sign in to your Barkhaus account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-stone pt-2">
          Don't have an account?{' '}
          <a href="/signup" className="text-warm-brown font-semibold hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
