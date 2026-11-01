import { useEffect, useState } from 'react';
import { workspaceAuthUrl } from '../lib/workspace-auth';

// Credentials and OAuth stay on the workspace origin so returning sessions work.
export default function LoginForm() {
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try { setDestination(workspaceAuthUrl(import.meta.env.PUBLIC_APP_URL, 'login')); }
    catch { setError('Sign-in is temporarily unavailable. Please contact BarkHaus.'); }
  }, []);
  return <div className="max-w-md mx-auto text-center">
    <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Welcome back</h2>
    <p className="text-deep-taupe mb-6">Sign in to your BarkHaus workspace.</p>
    {destination && <a href={destination} className="block w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition">Sign in</a>}
    {error && <p role="alert">{error}</p>}
    <p className="text-sm text-deep-taupe mt-4">New to BarkHaus? <a href="/signup" className="text-warm-brown font-semibold hover:underline">Sign up</a></p>
  </div>;
}
