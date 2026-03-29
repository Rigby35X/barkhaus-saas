# Barkhaus — Claude Code Master Prompts

Copy-paste these prompts into Claude Code in order. Each one is complete and self-contained. Wait for each phase to finish and verify before running the next.

**All .md briefs live in the repo root** (not a docs/ subfolder).

---

## Prompt 1: Fix Tour Guide Button (Sidebar)

```
Do not ask for confirmation. Just execute.

Check apps/dashboard/src/components/Sidebar.tsx. It needs to accept an onRestartTour prop (type: () => void, optional) and render a Tour Guide button at the very bottom of the sidebar nav, below all nav items. App.tsx already passes onRestartTour to Layout — check Layout.tsx and make sure the prop is threaded through to Sidebar. Do not change any other sidebar styling or nav items. Run npm run build from apps/dashboard/ and fix any errors.
```

---

## Prompt 2: Phase 1 — Xano Fixes

```
Do not ask for confirmation. Just execute.

Read apps/dashboard/src/tabs/DashboardOverview.tsx and apps/dashboard/src/lib/api.ts first. Then:

1. Wire the four stat cards (Total Animals, Available, Pending, Adopted) to count animals from the Xano animals API. Available, Pending, and Adopted counts should filter the returned array by status field.

2. Open apps/dashboard/src/components/AnimalForm.tsx (or MBPRPuppyForm.tsx if AnimalForm doesn't exist yet). Rename to AnimalForm.tsx, remove any MBPR-specific hardcoded labels, and make it work for any org. Keep MBPR-only fields conditionally rendered for orgId === 9.

3. Add required field validation so the name field cannot be empty before saving.

Wrap all Xano calls in try/catch with a visible error state. Do not change any UI layout or styling. Run npm run build from apps/dashboard/ and fix any errors.
```

---

## Prompt 3: Phase 3.5 — Cleanup

```
Do not ask for confirmation. Just execute.

Read barkhaus-phase3.5-cleanup.md in the repo root. Follow it exactly. In summary:

1. Remove all Paragon/Mailchimp code from CommunicationsTab.tsx, lib/api.ts, and IntegrationsTab.tsx. The Communications tab should only show the Form Submissions inbox from Xano.

2. Make the dashboard mobile-responsive: collapsible sidebar with hamburger on mobile, responsive grid for animals, scrollable modals, touch-friendly inputs.

3. Add React.lazy + Suspense lazy loading for all tab components in App.tsx.

Run npm run build from apps/dashboard/ after all changes. Fix any TypeScript errors. Verify: grep -ri "paragon\|mailchimp\|skypack" apps/dashboard/src/ should return nothing.
```

---

## Prompt 4: Phase 3.6 — Onboarding Tour

```
Do not ask for confirmation. Just execute.

Read barkhaus-phase3.6-onboarding.md in the repo root. Follow it exactly. Build:

1. apps/dashboard/src/lib/onboarding.ts — OnboardingStep interface, 11 step definitions, localStorage helpers (isOnboardingComplete, markOnboardingComplete, resetOnboarding).

2. apps/dashboard/src/components/Onboarding.tsx — Full-screen overlay with box-shadow spotlight cutout, tooltip card with progress bar, Back/Next/Skip/Finish buttons, auto-positioning, tab navigation via onNavigateTab with 350ms delay.

3. Update Sidebar.tsx to accept onRestartTour prop and render Tour Guide button at bottom of nav.

4. Update Layout.tsx to thread onRestartTour through to Sidebar.

5. Update App.tsx: add showOnboarding state, auto-start tour on first login, handleRestartTour resets and reopens.

Do not install any third-party tour libraries. Run npm run build and fix any errors.
```

---

## Prompt 5: Phase 5 — Marketing Site

```
Do not ask for confirmation. Just execute.

Read barkhaus-phase5-marketing.md in the repo root. Follow it exactly. Rebuild apps/marketing/ as an Astro SSG site with Tailwind and React islands.

Build in this order:
1. astro.config.mjs, tailwind.config.mjs, vercel.json
2. src/components/BaseLayout.astro, Navbar.astro, Footer.astro
3. src/components/Hero.astro, FeatureCard.astro, PricingCard.astro, TestimonialCard.astro, FAQItem.astro, CTABanner.astro
4. src/components/LoginForm.tsx, SignupForm.tsx (React islands)
5. src/pages/index.astro (8 sections)
6. src/pages/features.astro, pricing.astro, about.astro, contact.astro
7. src/pages/login.astro, signup.astro, forgot-password.astro
8. src/pages/signup/success.astro, signup/cancelled.astro

Run npm run build from apps/marketing/ and fix all errors until the build passes with zero errors.
```

---

## Prompt 6: Phase 5.5 — JWT Auth + Stripe

```
Do not ask for confirmation. Just execute.

Read barkhaus-phase5.5-auth.md in the repo root. Follow it exactly. Implement JWT auth across both apps:

In apps/marketing/:
- Update LoginForm.tsx to POST to Xano auth endpoint, store token, redirect to app.barkhaus.io?token=
- Update SignupForm.tsx Step 3 to call /api/auth/signup, then Stripe for Professional plan

In apps/dashboard/:
- Update lib/auth.ts: add jwtLogin(), initSession(), loginUnified() — keep ORG_CREDENTIALS fallback
- Update lib/api.ts: add getAuthHeaders(), include on all requests, handle 401
- Update App.tsx: read ?token= on mount, email+password login as primary with legacy toggle

All API calls in try/catch. Run npm run build in both apps. Fix all TypeScript errors. Verify legacy org ID login still works.
```

---

## Prompt 7: Phase 2 — Wire Forms to Supabase/Xano

```
Do not ask for confirmation. Just execute.

Read apps/tenant-site/src/pages/forms/ — there are four form pages. Read apps/tenant-site/public/admin/barkhaus-admin.html to get the exact field names for each form type.

The adoption form already POSTs to Supabase (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY). Check apps/tenant-site/src/pages/forms/adoption-application.astro to confirm it's wired correctly.

For the remaining forms:
- foster-application.astro: if it uses a Cognito embed, leave it as-is
- relinquishment-application.astro: if it uses a Cognito embed, leave it as-is
- volunteer-application.astro: this form is empty — build it with fields from barkhaus-admin.html and POST to Supabase applications table with form_type: 'volunteer', org_id: 9, status: 'new', and full form_data JSONB

For any form that needs to POST to Supabase, use the same pattern as adoption-application.astro: inject PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY via define:vars, use an inline submit script.

Show success and error states on all forms. Run npm run build from apps/tenant-site/ and fix any errors.
```

---

## Between Phases: Manual Steps

After each phase completes:

1. `git add -A && git commit -m "phase X: description" && git push origin main`
2. Check Vercel — each project should auto-deploy:
   - `barkhaus-marketing` → barkhaus.io
   - `barkhaus-dashboard` → app.barkhaus.io
   - `barkhaus-tenant-site` → *.preview.barkhaus.io
3. Smoke test the live URLs
4. Hard refresh browser (Cmd+Shift+R) to clear cache

---

## Troubleshooting

**Still seeing old code after deploy**
→ Check you're on app.barkhaus.io not a Netlify URL
→ Hard refresh: Cmd+Shift+R
→ Check Vercel deployments tab — confirm build completed

**TypeScript errors on build**
→ Tell Claude Code: "Fix all TypeScript errors in apps/dashboard/. Run npm run build and fix until zero errors."

**Xano returning errors**
→ Expected — Xano instance has uptime issues. The error states in the UI are correct behavior.
→ Check Xano dashboard for instance status

**File too large to read**
→ Tell Claude Code: "Read the file in sections — lines 1-500, then 501-1000, etc."

**Supabase env vars missing**
→ Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to barkhaus-tenant-site in Vercel environment variables