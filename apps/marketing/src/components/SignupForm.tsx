import { useState, type FormEvent, type ChangeEvent } from 'react';
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

type Plan = 'starter' | 'growth' | 'pro';

interface AccountFields {
  orgName: string;
  yourName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  orgName?: string;
  yourName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAccount(fields: AccountFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.orgName.trim()) errors.orgName = 'Organization name is required';
  if (!fields.yourName.trim()) errors.yourName = 'Your name is required';
  if (!fields.email.trim()) errors.email = 'Email is required';
  else if (!validateEmail(fields.email)) errors.email = 'Enter a valid email address';
  if (!fields.password) errors.password = 'Password is required';
  else if (fields.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!fields.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

function getInitialPlan(): Plan {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p === 'growth' || p === 'pro' || p === 'starter') return p;
  }
  return 'starter';
}

export default function SignupForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [account, setAccount] = useState<AccountFields>({
    orgName: '',
    yourName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [plan, setPlan] = useState<Plan>(getInitialPlan());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleAccountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccount((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    const errors = validateAccount(account);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setStep(2);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://barkhaus.io/auth/callback',
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  const handleStep2Submit = (e: FormEvent) => {
    e.preventDefault();
    void handleSignup();
  };

  const handleSignup = async () => {
    setProcessing(true);
    setError('');
    setStep(3);

    try {
      const { data, error: signupError } = await getSupabase().auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            full_name: account.yourName,
            org_name: account.orgName,
            plan,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) throw signupError;

      if (data.session) {
        window.location.href = APP_URL();
      }
      // else: email confirmation sent — show success state
      setProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  // Step 3 — Processing / Success / Error
  if (step === 3) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        {error ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-3">Something Went Wrong</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => { setStep(1); setError(''); setProcessing(false); }}
              className="px-6 py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Try Again
            </button>
          </>
        ) : processing ? (
          <>
            <div className="w-12 h-12 border-4 border-cloud border-t-warm-brown rounded-full animate-spin mx-auto mb-6" />
            <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Creating Your Account…</h2>
            <p className="text-deep-taupe">Hang tight while we get everything ready.</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-3">Check Your Email</h2>
            <p className="text-deep-taupe mb-6">
              We sent a confirmation link to <strong>{account.email}</strong>. Click it to activate your account.
            </p>
            <a href="/login" className="inline-block px-6 py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition">
              Go to Sign In
            </a>
          </>
        )}
      </div>
    );
  }

  // Step 2 — Plan selection
  if (step === 2) {
    const plans: { key: Plan; name: string; price: string; description: string; features: string[] }[] = [
      {
        key: 'starter',
        name: 'Starter',
        price: '$49/mo',
        description: 'Perfect for small rescues just getting started.',
        features: ['Up to 25 animals', 'Public website', 'Online applications', 'Community support'],
      },
      {
        key: 'growth',
        name: 'Growth',
        price: '$199/mo',
        description: 'For growing organizations that need more power.',
        features: ['Unlimited animals', 'AI social posts', 'Custom domain', 'Priority support'],
      },
      {
        key: 'pro',
        name: 'Pro',
        price: '$299/mo',
        description: 'For large multi-location organizations.',
        features: ['Everything in Growth', 'Multi-org access', 'API access', 'Dedicated support'],
      },
    ];

    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Choose Your Plan</h2>
          <p className="text-deep-taupe">14-day free trial on all plans. No credit card required.</p>
        </div>

        <form onSubmit={handleStep2Submit}>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {plans.map((p) => (
              <label
                key={p.key}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition ${
                  plan === p.key
                    ? 'border-warm-brown bg-warm-brown/5'
                    : 'border-silver-gray hover:border-warm-brown/50'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.key}
                  checked={plan === p.key}
                  onChange={() => setPlan(p.key)}
                  className="sr-only"
                />
                <div className="flex justify-between items-start mb-3">
                  <span className="font-serif font-bold text-deep-taupe text-lg">{p.name}</span>
                  {plan === p.key && (
                    <span className="w-5 h-5 rounded-full bg-warm-brown flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold text-warm-brown mb-2">{p.price}</div>
                <p className="text-xs text-deep-taupe mb-3">{p.description}</p>
                <ul className="space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-deep-taupe flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-warm-brown flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-silver-gray text-deep-taupe rounded-xl font-semibold hover:bg-cloud transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Start Free Trial
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 1 — Account details
  const inputClass = (field: keyof FieldErrors) =>
    `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown ${
      fieldErrors[field] ? 'border-red-400 bg-red-50' : 'border-silver-gray'
    }`;

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Create Your Account</h2>
        <p className="text-deep-taupe">14-day free trial. No credit card required.</p>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleSignup()}
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
        <span className="text-xs text-deep-taupe">or</span>
        <div className="flex-1 h-px bg-silver-gray" />
      </div>

      <form onSubmit={handleStep1Submit} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-deep-taupe uppercase tracking-wider mb-1">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="orgName"
            value={account.orgName}
            onChange={handleAccountChange}
            placeholder="Happy Paws Rescue"
            className={inputClass('orgName')}
          />
          {fieldErrors.orgName && <p className="text-xs text-red-600 mt-1">{fieldErrors.orgName}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-deep-taupe uppercase tracking-wider mb-1">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="yourName"
            value={account.yourName}
            onChange={handleAccountChange}
            placeholder="Jane Smith"
            className={inputClass('yourName')}
          />
          {fieldErrors.yourName && <p className="text-xs text-red-600 mt-1">{fieldErrors.yourName}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-deep-taupe uppercase tracking-wider mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={account.email}
            onChange={handleAccountChange}
            placeholder="jane@happypaws.org"
            className={inputClass('email')}
          />
          {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-deep-taupe uppercase tracking-wider mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            value={account.password}
            onChange={handleAccountChange}
            placeholder="Min. 8 characters"
            className={inputClass('password')}
          />
          {fieldErrors.password && <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-deep-taupe uppercase tracking-wider mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={account.confirmPassword}
            onChange={handleAccountChange}
            placeholder="Re-enter your password"
            className={inputClass('confirmPassword')}
          />
          {fieldErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="submit"
          className="w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition mt-2"
        >
          Continue
        </button>

        <p className="text-center text-sm text-deep-taupe pt-2">
          Already have an account?{' '}
          <a href="/login" className="text-warm-brown font-semibold hover:underline">
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}
