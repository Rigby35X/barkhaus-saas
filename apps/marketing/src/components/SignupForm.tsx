import { useEffect } from 'react';
const APP_URL = (import.meta as unknown as { env: Record<string, string> }).env.PUBLIC_APP_URL ?? 'https://app.barkhaus.io';
const signupUrl = new URL('/signup', APP_URL).href;
export default function SignupForm() {
  useEffect(() => { window.location.replace(signupUrl); }, []);
  return <div className="text-center">
    <h2 className="font-serif text-2xl font-bold mb-3">Create your BarkHaus account</h2>
    <p className="mb-4">Continue to set up your account and rescue.</p>
    <a href={signupUrl} className="text-warm-brown underline">Continue to account setup</a>
  </div>;
}
