const getEnv = () => (import.meta as unknown as { env: Record<string, string> }).env;

// Supabase sessions in browser storage do not cross origins. Collect credentials
// on the dashboard itself rather than forwarding tokens through URLs.
export default function LoginForm() {
  const appUrl = getEnv().PUBLIC_APP_URL ?? 'https://app.barkhaus.io';
  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Welcome back</h2>
      <p className="text-deep-taupe mb-6">Continue to your BarkHaus workspace to sign in.</p>
      <a href={appUrl} className="block w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition">Continue to BarkHaus</a>
      <p className="text-sm text-deep-taupe mt-4">Don't have an account? <a href="/signup" className="text-warm-brown font-semibold hover:underline">Start free trial</a></p>
    </div>
  );
}
