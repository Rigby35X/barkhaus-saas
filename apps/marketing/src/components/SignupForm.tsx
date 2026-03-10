import { useState, type FormEvent, type ChangeEvent } from 'react';

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env)
  ? ((import.meta as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? '')
  : '';
const APP_URL = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env)
  ? ((import.meta as { env: Record<string, string> }).env.VITE_APP_URL ?? 'https://app.barkhaus.io')
  : 'https://app.barkhaus.io';

type Plan = 'starter' | 'professional' | 'enterprise';

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
  const [plan, setPlan] = useState<Plan>('starter');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

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

  const handleStep2Submit = (e: FormEvent) => {
    e.preventDefault();
    if (plan === 'enterprise') {
      setStep(3);
      return;
    }
    setStep(3);
    handleSignup();
  };

  const handleSignup = async () => {
    setProcessing(true);
    setError('');

    try {
      // Step 1: create account
      const signupRes = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: account.orgName,
          admin_email: account.email,
          admin_password: account.password,
          admin_name: account.yourName,
          plan,
        }),
      });

      if (!signupRes.ok) {
        const err = await signupRes.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Signup failed. Please try again.');
      }

      const signupData = await signupRes.json() as { authToken?: string; token?: string; org_id?: number };
      const authToken = signupData.authToken ?? signupData.token ?? '';
      const orgId = signupData.org_id;

      if (plan === 'starter') {
        if (authToken) localStorage.setItem('barkhausAuthToken', authToken);
        window.location.href = `${APP_URL}${authToken ? `?token=${encodeURIComponent(authToken)}` : ''}`;
        return;
      }

      if (plan === 'professional') {
        const successUrl = `${window.location.origin}/signup/success`;
        const cancelUrl = `${window.location.origin}/signup/cancelled`;

        const billingRes = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: orgId,
            plan: 'professional',
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        if (!billingRes.ok) {
          const err = await billingRes.json().catch(() => ({})) as { message?: string };
          throw new Error(err.message ?? 'Could not start checkout. Please try again.');
        }

        const billingData = await billingRes.json() as { checkout_url?: string };
        const checkoutUrl = billingData.checkout_url;
        if (!checkoutUrl) throw new Error('No checkout URL returned.');
        window.location.href = checkoutUrl;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  // Step 3 — Processing / Enterprise
  if (step === 3) {
    if (plan === 'enterprise') {
      return (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-3">Let's talk Enterprise</h2>
          <p className="text-stone mb-6">
            Our team will reach out to set up a custom plan tailored to your organization's needs.
          </p>
          <a
            href="mailto:hello@barkhaus.io"
            className="inline-block px-8 py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition"
          >
            Contact us at hello@barkhaus.io
          </a>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto text-center py-12">
        {error ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-3">Something went wrong</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => { setStep(1); setError(''); setProcessing(false); }}
              className="px-6 py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-cloud border-t-warm-brown rounded-full animate-spin mx-auto mb-6" />
            <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">
              {plan === 'professional' ? 'Setting up your account…' : 'Creating your account…'}
            </h2>
            <p className="text-stone">
              {plan === 'professional'
                ? 'You\'ll be redirected to checkout in a moment.'
                : 'Hang tight while we get everything ready.'}
            </p>
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
        price: 'Free',
        description: 'Perfect for small rescues just getting started.',
        features: ['Up to 20 animals', 'Public website', 'Basic applications', 'Email support'],
      },
      {
        key: 'professional',
        name: 'Professional',
        price: '$29/mo',
        description: 'For growing organizations that need more power.',
        features: ['Unlimited animals', 'AI social posts', 'Advanced analytics', 'Priority support'],
      },
      {
        key: 'enterprise',
        name: 'Enterprise',
        price: 'Contact Us',
        description: 'Custom solutions for large multi-location shelters.',
        features: ['Everything in Pro', 'Custom integrations', 'Dedicated manager', 'SLA guarantee'],
      },
    ];

    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Choose your plan</h2>
          <p className="text-stone">You can upgrade anytime.</p>
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
                <div className="text-2xl font-bold text-warm-brown mb-2">{p.price}</div>
                <p className="text-xs text-stone mb-3">{p.description}</p>
                <ul className="space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-stone flex items-center gap-1.5">
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
              {plan === 'enterprise'
                ? 'Contact Sales'
                : plan === 'professional'
                ? 'Continue to Checkout'
                : 'Create Free Account'}
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
        <h2 className="font-serif text-2xl font-bold text-deep-taupe mb-2">Create your account</h2>
        <p className="text-stone">Get started in under a minute.</p>
      </div>

      <form onSubmit={handleStep1Submit} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
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
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
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
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
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
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
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
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
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

        <button
          type="submit"
          className="w-full py-3 bg-warm-brown text-white rounded-xl font-semibold hover:opacity-90 transition mt-2"
        >
          Continue
        </button>

        <p className="text-center text-sm text-stone pt-2">
          Already have an account?{' '}
          <a href="/login" className="text-warm-brown font-semibold hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
