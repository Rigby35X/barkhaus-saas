import { useEffect, useState } from 'react';
import { workspaceAuthUrl } from '../lib/workspace-auth';

/** Account creation and OAuth happen on the same origin as sign-in. This page
 * forwards only an allowlisted plan preference, never credentials or access. */
export default function SignupForm() {
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try { setDestination(workspaceAuthUrl(import.meta.env.PUBLIC_APP_URL, 'signup', window.location.search)); }
    catch { setError('Signup is temporarily unavailable. Please contact BarkHaus.'); }
  }, []);
  return <div className="max-w-md mx-auto text-center">
    <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Create your BarkHaus account</h2>
    <p className="text-deep-taupe mb-6">Choose a plan and set up your account. You do not have to start with a free trial.</p>
    {destination && <a href={destination} className="block w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition">Sign up</a>}
    {error && <p role="alert">{error}</p>}
    <p className="text-sm text-deep-taupe mt-4"><a href="/pricing" className="text-warm-brown underline">View plans and pricing</a></p>
    <p className="text-sm text-deep-taupe mt-4">Already have an account? <a href="/login" className="text-warm-brown font-semibold hover:underline">Sign in</a></p>
  </div>;
}
