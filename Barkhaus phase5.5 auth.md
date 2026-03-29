# Barkhaus Phase 5.5 — JWT Auth + Stripe Checkout

## Overview

This brief is for autonomous Claude Code execution. Implement real authentication across the marketing site and dashboard. The marketing site handles signup/login and redirects to the dashboard with a JWT token. The dashboard accepts the token and falls back to legacy org credentials if JWT is unavailable.

**Important:** All API calls to auth endpoints must be wrapped in try/catch. The builds must pass even before the Xano backend endpoints exist — the legacy org credential fallback must continue to work throughout.

---

## Current Stack

- **Backend:** Xano at `xz6u-fpaz-praf.n7e.xano.io`
- **Forms:** Adoption form now POSTs to Supabase. Xano handles animals, applications, and org data.
- **Dashboard auth:** Currently uses hardcoded `ORG_CREDENTIALS` in `lib/api.ts`
- **Marketing:** Has `LoginForm.tsx` and `SignupForm.tsx` React islands (built in Phase 5)

---

## Xano Endpoints Needed (create manually in Xano dashboard)

### POST `/api/auth/signup`
Request body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "org_name": "string",
  "plan": "starter | professional | enterprise"
}
```
Response:
```json
{ "authToken": "string" }
```

### POST `/api/auth/login`
Request body:
```json
{ "email": "string", "password": "string" }
```
Response:
```json
{ "authToken": "string" }
```

### GET `/api/auth/me`
Headers: `Authorization: Bearer {token}`
Response:
```json
{ "id": number, "name": "string", "email": "string", "plan": "string" }
```

### POST `/api/billing/create-checkout-session`
Request body:
```json
{ "plan": "professional", "email": "string", "org_name": "string" }
```
Response:
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

## Xano Database Tables

### `users` table (create or verify exists)
| Column | Type | Notes |
|--------|------|-------|
| id | auto-increment | Primary key |
| email | text | Unique, indexed |
| password | text | Hashed by Xano |
| name | text | |
| org_id | integer | Foreign key → orgs |
| role | text | "admin" / "member" |
| created_at | timestamp | |

### `orgs` table (add columns if missing)
| Column | Type | Notes |
|--------|------|-------|
| plan | text | "starter" / "professional" / "enterprise" |
| stripe_customer_id | text | Nullable |
| stripe_subscription_id | text | Nullable |

---

## Cross-Domain Token Passing

After login on the marketing site, redirect to the dashboard with the token in the URL:

```ts
window.location.href = `https://app.barkhaus.io?token=${authToken}`;
```

The dashboard reads it on mount, stores it, and cleans the URL:

```ts
const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
if (urlToken) {
  localStorage.setItem('barkhausAuthToken', urlToken);
  history.replaceState(null, '', window.location.pathname);
}
```

---

## Changes Required

### `apps/marketing/src/components/LoginForm.tsx`
- POST to `VITE_XANO_AUTH_URL/api/auth/login` (or `PUBLIC_XANO_AUTH_URL` for Astro)
- On success: store token in localStorage, redirect to `https://app.barkhaus.io?token={token}`
- On error: show inline error
- Wrap in try/catch — if endpoint doesn't exist yet, show "Login unavailable, please use the dashboard directly"

### `apps/marketing/src/components/SignupForm.tsx`
- Step 3 Processing:
  - Starter: POST to `/api/auth/signup` → redirect to `https://app.barkhaus.io?token={token}`
  - Professional: POST to `/api/auth/signup` → POST to `/api/billing/create-checkout-session` → redirect to Stripe URL
  - Enterprise: show "Thanks, we'll be in touch" message
- Wrap all in try/catch with visible error states

### `apps/dashboard/src/lib/auth.ts`
- Add `jwtLogin(email, password)`: POST to Xano `/api/auth/login`, return token or throw
- Add `initSession()`: read `barkhausAuthToken` from localStorage, call GET `/api/auth/me`, return user info or null
- Keep `validateLogin(orgId, accessCode)` as legacy fallback — do not remove
- Add `loginUnified(emailOrOrgId, password)`: try JWT first, fall back to legacy org credentials
- Export `TOKEN_KEY = 'barkhausAuthToken'`

### `apps/dashboard/src/lib/api.ts`
- Add `getAuthHeaders()`: reads `barkhausAuthToken` from localStorage, returns `{ Authorization: 'Bearer {token}' }` or `{}`
- Include auth headers on all API requests
- On 401 response: clear localStorage token and redirect to `https://barkhaus.io/login`

### `apps/dashboard/src/App.tsx`
- On mount: check for `?token=` URL parameter, store it, clean URL, then call `initSession()`
- If `initSession()` returns a user: set session with that user's org
- If not: fall back to `restoreSession()` (legacy localStorage session)
- Login screen: show email + password as primary form, with "Use Org ID instead" toggle for legacy fallback
- Both login paths must work

---

## Environment Variables

### `apps/marketing/` (Astro — use `PUBLIC_` prefix)
```
PUBLIC_XANO_AUTH_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:YOUR_AUTH_ENDPOINT
```

### `apps/dashboard/` (Vite — use `VITE_` prefix)
```
VITE_XANO_AUTH_URL=https://xz6u-fpaz-praf.n7e.xano.io/api:YOUR_AUTH_ENDPOINT
```

Add these to Vercel for each project. Do not hardcode them.

---

## Implementation Order

1. Update `apps/marketing/src/components/LoginForm.tsx`
2. Update `apps/marketing/src/components/SignupForm.tsx`
3. Update `apps/dashboard/src/lib/auth.ts`
4. Update `apps/dashboard/src/lib/api.ts`
5. Update `apps/dashboard/src/App.tsx`
6. Add success/cancelled/forgot-password pages if not already present
7. Run `npm run build` in both apps — fix all TypeScript errors
8. Verify legacy org ID + access code login still works

---

## Verification Checklist

| Check | How to Verify |
|-------|---------------|
| Signup form renders | Visit `barkhaus.io/signup` — 3-step form shows |
| Login form renders | Visit `barkhaus.io/login` — email + password shows |
| Legacy login still works | Org 9 + mbpups2024 still logs in |
| URL token consumed | Arriving at `app.barkhaus.io?token=...` stores token and loads |
| 401 handling | Invalid token → redirected to login |
| Both apps build | Zero TypeScript errors in both |
| No hardcoded secrets | No Stripe keys or tokens in committed code |

---

## What NOT to Do

- Do not remove the hardcoded `ORG_CREDENTIALS` — keep as fallback
- Do not implement Stripe webhook handling in the frontend — that's Xano-side
- Do not replace Supabase or Xano with a different backend
- Do not touch `_archived/`