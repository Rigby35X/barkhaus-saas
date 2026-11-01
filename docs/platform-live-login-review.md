# Live login review: public artifacts only

Reviewed public pages and JavaScript on 2026-11-01 against integration baseline `a878ca5a34192cdff0f1eaaf956ec7226e256176`. This review made only anonymous public HTML/asset GET requests. It did not initiate Google OAuth, sign in/up, call Auth/account APIs, inspect customer records, change configuration or deploy code. Screenshots are observations, not proof of server-side membership assignment; their personal account details are not copied here. Public bundles are retained only in temporary workspace files, not committed.

## What is directly observable

- `https://barkhaus.io/login` redirects to `https://www.barkhaus.io/login` and returns the credential form shown by the user: Google sign-in and **Start Free Trial**. Its component is `/_astro/LoginForm.f-eut5jT.js` (SHA-256 `e3a966f4135ba9394e33e7d0ce0b0b129efdb572fbe19250561984133662d5c5`). The integration branch's `LoginForm.tsx` instead hands the user to the dashboard to sign in. The reviewed branch has not replaced the live page.
- The live marketing login bundle calls Supabase password/OAuth authentication on the marketing origin, uses a hardcoded marketing `/auth/callback` for Google, and navigates to `app.barkhaus.io` after a session. The live signup bundle follows the same marketing-to-dashboard pattern. Supabase browser sessions in local storage do not automatically transfer between those separate origins.
- `https://app.barkhaus.io` serves `/assets/index-BHI6qKa0.js` (SHA-256 `5bc1399c693c39c32f876d3474af9c8a984e0b99b4ef633da0face478e390eba`). That bundle contains legacy `barkhausAdminSession`, `barkhausAuthToken`, access-code/session fallback and `/api/auth/me` logic. It does not contain the new `organization_memberships` or `my_organization_access` names. This is not the current membership-based candidate.
- The served dashboard bundle's missing-organization fallback is **8**, not 9. The repository's old static `apps/dashboard/public/index.html` has several Org 9 fallbacks, but that static source is not the same asset served by the observed live root page. Do not conflate these artifacts or conclude that every new user is assigned Org 9.
- Live dashboard code can reuse a stored legacy organization session. A previously stored MBPR session is therefore a plausible explanation for seeing MBPR after marketing login, but it is **not confirmed for this user**. Whether an account genuinely has an MBPR membership was not queried and must not be inferred from the screen alone.

## Product behavior to correct

1. Use one dashboard-origin authentication entry point for password login, signup, Google callback and recovery. Marketing links should hand off there without tokens in URLs. Session detection should validate the signed-in user; marketing cannot assume a dashboard session from its own storage.
2. Require active server/database membership for workspace access. No hardcoded organization, legacy access code, cached organization preference, signup metadata or missing-org fallback may grant workspace access. A new account without membership needs its own organization-setup state, not MBPR or an arbitrary organization.
3. Use **Sign up** for account-creation links. Returning users should see **Sign in**; a valid signed-in session should continue to its verified workspace. Do not probe arbitrary email addresses to reveal whether another person's account exists.
4. Present plan selection independently of a mandatory free trial. Selecting a plan is only a preference until reviewed checkout/billing exists; it must not mark a subscription paid, create payment charges or grant roles from client metadata. The repo's currently observed signup path creates Auth metadata but does not demonstrate a functioning paid checkout or organization provisioning workflow.

## Why Google displays the Supabase hostname

The hostname in the screenshot is consistent with Supabase acting as the Google OAuth authentication callback service. It does not itself select MBPR or prove that the account belongs to a particular organization. An application code label cannot replace the hostname Google displays.

An authorized administrator should review Google OAuth app branding/consent settings (BarkHaus app name, owned domains, homepage/privacy/terms) and Supabase authentication configuration. Replacing the underlying Supabase hostname generally requires a configured Supabase custom Auth domain, its DNS verification and the corresponding Google authorized callback URI; availability can depend on the Supabase plan. Do not invent a callback URI or change it until the chosen Auth domain is configured and verified. Existing callback/redirect compatibility must be tested separately in staging before production changes.

No Google/Supabase administrative access was available or exercised, so this review does not claim the branding or custom-domain settings are correct or changed.

## Test handoff

Use controlled staging accounts once staging application and account creation are authorized. Verify separately: returning email login, new email account confirmation, existing/new Google account, refresh/sign-out, no-membership account, two organizations, revoked access, and paid-plan preference preservation without falsely reporting payment. Confirm a no-membership account never opens MBPR, and that the Google callback returns to the dashboard origin where the session was created. Do not ask the user to create more production accounts or use live MBPR records to test this draft candidate.

## Subsequent user clarification and second screenshot

The user confirmed the original account already should have MBPR access. Opening MBPR for that verified member is expected, not evidence that a new user was assigned MBPR. Testing a different email led to the old dashboard login form, with `9` shown in an email input and a `Use Org ID instead` option; it did not show entry into an MBPR workspace or records. The origin of the prefilled value (saved form state/autofill/legacy session) is not established. No account membership/customer data was queried to resolve it.

## Candidate repair

The candidate now centralizes email/Google sign-in and signup on the dashboard origin, provides separate returning/new-account screens, replaces trial-only entry labels with **Sign up**, preserves an allowlisted paid/trial plan preference, and gives an authenticated account with no membership its own pending-organization screen. Existing verified MBPR members still resolve only through their active memberships. Legacy saved organization preferences cannot grant access, and logout clears signup intent before another account uses the browser. The old marketing callback no longer exchanges/forwards sessions across origins; it removes old callback parameters and asks the user to sign in on the workspace.

The pending-organization screen offers existing invitation acceptance and assisted organization setup; self-service organization creation and actual paid checkout remain unfinished. Plan preference never activates billing or creates a charge/role/membership. Google consent/domain branding remains an administrator configuration task. `deploy/staging/auth-redirects.json` prepares exact local-staging callback URLs without applying settings.

Marketing and dashboard must be reviewed/tested together. Do not deploy the new marketing handoff by itself against the old live dashboard, or treat the live site as this candidate. No production deployment, OAuth configuration, remote migration or account test occurred in this repair.
