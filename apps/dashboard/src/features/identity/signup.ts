export type SignupPlan = 'starter' | 'growth' | 'pro';
export type BillingPreference = 'paid' | 'trial';
export interface SignupIntent { plan: SignupPlan; billing: BillingPreference }
export type EntryMode = 'login' | 'signup';
const PLANS: readonly string[] = ['starter', 'growth', 'pro'];
const BILLING: readonly string[] = ['paid', 'trial'];
const DASHBOARD_ORIGINS = new Set(['https://app.barkhaus.io', 'http://localhost:5173']);
export const SIGNUP_INTENT_KEY = 'barkhausSignupIntent';
interface IntentStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** Routing preferences only: never proof of a subscription, organization or role. */
export function parseSignupIntent(search: string): SignupIntent | null {
  const query = new URLSearchParams(search);
  if (query.getAll('plan').length !== 1 || query.getAll('billing').length > 1) return null;
  const plan = query.get('plan');
  const billing = query.get('billing') ?? 'paid';
  return plan && PLANS.includes(plan) && BILLING.includes(billing)
    ? { plan: plan as SignupPlan, billing: billing as BillingPreference } : null;
}
export function readSavedSignupIntent(storage: IntentStorage): SignupIntent | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(SIGNUP_INTENT_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (typeof row.plan !== 'string' || typeof row.billing !== 'string' || !PLANS.includes(row.plan) || !BILLING.includes(row.billing)) return null;
    return { plan: row.plan as SignupPlan, billing: row.billing as BillingPreference };
  } catch { return null; }
}
export function saveSignupIntent(storage: IntentStorage, intent: SignupIntent): void {
  if (!PLANS.includes(intent.plan) || !BILLING.includes(intent.billing)) throw new Error('Choose a supported plan.');
  try { storage.setItem(SIGNUP_INTENT_KEY, JSON.stringify({ plan: intent.plan, billing: intent.billing })); } catch { /* Callback query also preserves nonsecret intent. */ }
}
export function captureSignupIntent(search: string, storage: IntentStorage): SignupIntent | null {
  const incoming = parseSignupIntent(search);
  if (incoming) saveSignupIntent(storage, incoming);
  return incoming ?? readSavedSignupIntent(storage);
}
export function signupRedirect(origin: string, mode: EntryMode, intent: SignupIntent | null): string {
  if (!DASHBOARD_ORIGINS.has(origin) || !['login', 'signup'].includes(mode)) throw new Error('Sign-in is not configured for this deployment.');
  const callback = new URL(mode === 'signup' ? '/signup' : '/login', origin);
  if (intent) {
    if (!PLANS.includes(intent.plan) || !BILLING.includes(intent.billing)) throw new Error('Choose a supported plan.');
    callback.searchParams.set('plan', intent.plan);
    callback.searchParams.set('billing', intent.billing);
  }
  return callback.href;
}
interface SignupInput { fullName: string; organizationName: string; email: string; password: string; intent: SignupIntent }
interface EmailSignupClient {
  auth: {
    signUp(input: { email: string; password: string; options: { emailRedirectTo: string; data: Record<string, string> } }): Promise<{ data: { session: unknown | null }; error: unknown }>;
  };
}
export async function signUpWithEmail(client: EmailSignupClient, input: SignupInput, origin: string): Promise<'confirmation-required' | 'signed-in'> {
  const fullName = input.fullName.trim();
  const organizationName = input.organizationName.trim();
  if (!fullName || fullName.length > 120 || !organizationName || organizationName.length > 160) throw new Error('Enter your name and organization name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim()) || input.password.length < 12) throw new Error('Use a valid email and a password with at least 12 characters.');
  const callback = signupRedirect(origin, 'signup', input.intent);
  // These editable metadata fields describe preferences. Only trusted server
  // provisioning and payment verification can create memberships/subscriptions.
  let response;
  try {
    response = await client.auth.signUp({
      email: input.email.trim(), password: input.password,
      options: { emailRedirectTo: callback, data: { full_name: fullName, organization_name: organizationName, requested_plan: input.intent.plan, billing_preference: input.intent.billing } },
    });
  } catch { throw new Error('Unable to create your account. Please try again or sign in.'); }
  const { data, error } = response;
  if (error) {
    if (typeof error === 'object' && 'code' in error && error.code === 'user_already_exists') return 'confirmation-required';
    throw new Error('Unable to create your account. Please try again or sign in.');
  }
  return data.session ? 'signed-in' : 'confirmation-required';
}
interface GoogleClient {
  auth: {
    signInWithOAuth(input: { provider: 'google'; options: { redirectTo: string; queryParams: { prompt: 'select_account' } } }): Promise<{ error: unknown }>;
  };
}
export async function signInWithGoogle(client: GoogleClient, origin: string, mode: EntryMode, intent: SignupIntent | null): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: signupRedirect(origin, mode, intent), queryParams: { prompt: 'select_account' } } });
  if (error) throw new Error('Google sign-in is unavailable. Please use email or try again later.');
}
