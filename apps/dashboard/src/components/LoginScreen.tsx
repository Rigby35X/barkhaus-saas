import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RECOVERY_PENDING, requestRecovery, finishRecovery, acceptInvitation } from '../features/identity/recovery';
import { captureSignupIntent, saveSignupIntent, signInWithGoogle, signUpWithEmail, type SignupIntent } from '../features/identity/signup';
import { login } from '../lib/auth';

type Mode = 'login' | 'signup' | 'request' | 'reset';
export default function LoginScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(() => sessionStorage.getItem(RECOVERY_PENDING) === 'true' ? 'reset' : location.pathname.replace(/\/$/, '') === '/signup' ? 'signup' : 'login');
  const [intent, setIntent] = useState<SignupIntent>(() => captureSignupIntent(location.search, sessionStorage) ?? { plan: 'starter', billing: 'paid' });
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(RECOVERY_PENDING) !== 'true') setMode(location.pathname.replace(/\/$/, '') === '/signup' ? 'signup' : 'login');
    const selected = captureSignupIntent(location.search, sessionStorage);
    if (selected) setIntent(selected);
    setError(''); setMessage('');
  }, [location.pathname, location.search]);
  useEffect(() => {
    const onRecovery = () => setMode('reset');
    window.addEventListener('barkhaus-recovery', onRecovery);
    return () => window.removeEventListener('barkhaus-recovery', onRecovery);
  }, []);
  const updateIntent = (value: SignupIntent) => { setIntent(value); saveSignupIntent(sessionStorage, value); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured || loading) return;
    setError(''); setMessage(''); setLoading(true);
    let invitationAccepted = false;
    try {
      if (mode === 'request') {
        await requestRecovery(supabase, email, window.location.origin);
        setMessage('If this address has an account, a recovery email will arrive shortly.');
      } else if (mode === 'reset') {
        await finishRecovery(supabase, password);
        sessionStorage.removeItem(RECOVERY_PENDING);
        setPassword(''); setMode('login'); navigate('/login', { replace: true });
        setMessage('Password updated. Sign in with your new password.');
      } else if (mode === 'signup') {
        saveSignupIntent(sessionStorage, intent);
        const result = await signUpWithEmail(supabase, { fullName, organizationName, email, password, intent }, window.location.origin);
        setPassword('');
        setMessage(result === 'signed-in' ? 'Your account is ready. Organization setup is next.' : 'Check your email to continue. If you already have an account, sign in or reset your password.');
      } else {
        if (invitation) sessionStorage.setItem('barkhausInvitationPending', 'true');
        await login(email, password);
        if (invitation) { await acceptInvitation(supabase, invitation); invitationAccepted = true; }
      }
    } catch (failure) {
      if (invitation && mode === 'login') await supabase.auth.signOut();
      setError(mode === 'signup' && failure instanceof Error ? failure.message : 'Unable to complete this request. Check your details or request a new link.');
    } finally {
      sessionStorage.removeItem('barkhausInvitationPending');
      if (invitationAccepted) window.dispatchEvent(new Event('focus'));
      setLoading(false);
    }
  };
  const google = async () => {
    if (!isSupabaseConfigured || loading || (mode !== 'signup' && mode !== 'login')) return;
    setLoading(true); setError('');
    if (invitation && mode === 'login') { setError('Use email sign-in below to accept this staff invitation.'); setLoading(false); return; }
    try {
      const selected = mode === 'signup' ? intent : captureSignupIntent(location.search, sessionStorage);
      if (selected) saveSignupIntent(sessionStorage, selected);
      await signInWithGoogle(supabase, window.location.origin, mode, selected);
    } catch { setError('Google sign-in is unavailable. Please use email or try again later.'); }
    finally { setLoading(false); }
  };
  const signup = mode === 'signup';
  const heading = signup ? 'Create your BarkHaus account' : mode === 'request' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Welcome back';
  const switchQuery = `?plan=${intent.plan}&billing=${intent.billing}`;
  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <a href="https://barkhaus.io" className="font-serif text-lg text-warm-brown">BarkHaus</a>
        <h1 className="text-3xl font-serif font-bold text-deep-taupe mt-4">{heading}</h1>
        <p className="text-stone mt-2 mb-6">{signup ? 'Bring your records into BarkHaus or connect supported animal software.' : mode === 'login' ? 'Sign in to your existing rescue workspace.' : 'Use the email associated with your BarkHaus account.'}</p>
        {!isSupabaseConfigured && <p role="alert" className="text-sm text-red-600 mb-4">Sign-in is not configured for this deployment. Contact your administrator.</p>}
        {(mode === 'login' || signup) && <><button type="button" disabled={loading || !isSupabaseConfigured} onClick={() => void google()} className="w-full border border-silver-gray rounded-xl px-4 py-3 font-semibold">Continue with Google</button><p className="text-center text-sm text-stone my-4">or {signup ? 'sign up' : 'sign in'} with email</p></>}
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {signup && <><div><label htmlFor="signup-name" className="block text-sm font-semibold mb-1">Your name</label><input id="signup-name" autoComplete="name" required maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} className="w-full border rounded-xl px-4 py-3" /></div><div><label htmlFor="signup-organization" className="block text-sm font-semibold mb-1">Organization name</label><input id="signup-organization" autoComplete="organization" required maxLength={160} value={organizationName} onChange={event => setOrganizationName(event.target.value)} className="w-full border rounded-xl px-4 py-3" /></div></>}
          {mode !== 'reset' && <div><label htmlFor="login-email" className="block text-sm font-semibold mb-1">Email</label><input id="login-email" name="email" type="email" autoComplete={signup ? 'email' : 'username'} required value={email} onChange={event => setEmail(event.target.value)} className="w-full border rounded-xl px-4 py-3" /></div>}
          {mode !== 'request' && <div><label htmlFor="login-password" className="block text-sm font-semibold mb-1">Password</label><input id="login-password" name="password" type="password" minLength={signup || mode === 'reset' ? 12 : undefined} autoComplete={signup || mode === 'reset' ? 'new-password' : 'current-password'} required value={password} onChange={event => setPassword(event.target.value)} className="w-full border rounded-xl px-4 py-3" />{signup && <p className="text-xs text-stone mt-1">Use at least 12 characters.</p>}</div>}
          {signup && <fieldset className="space-y-3"><legend className="text-sm font-semibold">Your plan preference</legend><label className="block text-sm">Plan<select value={intent.plan} onChange={event => updateIntent({ ...intent, plan: event.target.value as SignupIntent['plan'] })} className="w-full border rounded-xl px-3 py-2"><option value="starter">Starter</option><option value="growth">Growth</option><option value="pro">Pro</option></select></label><label className="block text-sm">How would you like to begin?<select value={intent.billing} onChange={event => updateIntent({ ...intent, billing: event.target.value as SignupIntent['billing'] })} className="w-full border rounded-xl px-3 py-2"><option value="paid">Choose a paid plan</option><option value="trial">Request a trial</option></select></label><p className="text-xs text-stone">No payment is collected here. Your selection does not start a subscription.</p></fieldset>}
          {mode === 'login' && <details className="text-sm"><summary>Have a staff invitation?</summary><label className="block mt-2">Invitation token<input aria-label="Invitation token" value={invitation} onChange={event => setInvitation(event.target.value)} className="w-full border rounded px-3 py-2" /></label></details>}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={loading || !isSupabaseConfigured} className="w-full py-3 bg-warm-brown text-white font-semibold rounded-xl disabled:opacity-50">{loading ? 'Please wait…' : mode === 'request' ? 'Send recovery email' : mode === 'reset' ? 'Set new password' : signup ? 'Sign up' : 'Sign in'}</button>
        </form>
        {mode === 'reset' && <button type="button" className="mt-4 text-sm underline" onClick={() => { void supabase.auth.signOut().then(() => { sessionStorage.removeItem(RECOVERY_PENDING); setMode('request'); setPassword(''); }); }}>Request a new recovery link</button>}
        {(mode === 'login' || mode === 'request') && <button type="button" className="mt-4 text-sm underline" onClick={() => { setError(''); setMessage(''); setMode(mode === 'request' ? 'login' : 'request'); }}>{mode === 'request' ? 'Back to sign in' : 'Forgot password?'}</button>}
        {(mode === 'login' || signup) && <p className="mt-6 text-sm">{signup ? 'Already have an account? ' : 'New to BarkHaus? '}<Link to={`${signup ? '/login' : '/signup'}${switchQuery}`} className="text-warm-brown underline">{signup ? 'Sign in' : 'Sign up'}</Link></p>}
      </div>
    </div>
  );
}
