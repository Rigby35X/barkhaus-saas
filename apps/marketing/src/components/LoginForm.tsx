import { useEffect } from 'react';

const APP_URL = (import.meta as unknown as { env: Record<string, string> }).env.PUBLIC_APP_URL ?? 'https://app.barkhaus.io';
const loginUrl = new URL('/login', APP_URL).href;

export default function LoginForm() {
  useEffect(() => { window.location.replace(loginUrl); }, []);
  return <div className="text-center">
    <h2 className="font-serif text-2xl font-bold mb-3">Sign in to BarkHaus</h2>
    <p className="mb-4">Taking you to your dashboard sign-in…</p>
    <a href={loginUrl} className="text-warm-brown underline">Continue to BarkHaus</a>
  </div>;
}
