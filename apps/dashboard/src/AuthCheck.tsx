import SupabaseAccess from './components/SupabaseAccess';
export default function AuthCheck() {
  return <SupabaseAccess>{(access, signOut) =>
    <main className="min-h-screen bg-cloud flex items-center justify-center p-6">
      <section className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <h1 className="text-2xl font-bold mb-4">BarkHaus sign-in test passed</h1>
        <p className="mb-4">Your Supabase identity and organization membership were verified.</p>
        <dl className="mb-6"><dt className="font-bold">Organization</dt><dd>{access.orgConfig.name}</dd>
          <dt className="font-bold mt-3">Role</dt><dd>{access.role}</dd></dl>
        <p className="mb-6">Refresh this page to test session persistence, then sign out. This test has no rescue-record editing tools.</p>
        <button className="rounded-lg bg-warm-brown text-white px-5 py-3" onClick={signOut}>Sign out</button>
      </section>
    </main>
  }</SupabaseAccess>;
}
