# Login and signup: what to test next

**Status:** fixes are in draft PR #11, not on the live site. Do not create more production accounts or use MBPR records to test this draft. Source/staging exports are already received; no more exports are needed for this repair.

## Expected experience

1. **Returning member:** Sign in once, then open only an organization they actually belong to. An existing MBPR member may open MBPR.
2. **New account:** Choose **Sign up**, select a plan (paid is the default preference; a trial request is optional), and use email or Google. Account confirmation and login happen on the workspace website. It must not ask for an organization ID or assign an unrelated rescue.
3. **No organization yet:** Show the new account's pending setup screen. Accept an existing invitation or contact BarkHaus for assisted setup. Self-service organization creation is not complete yet.
4. **Payment:** Preserve the selected plan, but clearly say that no subscription is activated/payment collected by account creation. Actual checkout is separate unfinished work; editable signup preferences never count as a paid subscription.
5. **Same browser, different account:** Sign out, then use an unrelated account. Old MBPR preferences/session data cannot grant it access.

## Operator preparation — not applied

Use the isolated staging project `idybpiomulkebvhqibdp`, never production. Apply no remote SQL/settings until separately authorized against a reviewed commit. Test marketing and dashboard candidates together; the current live dashboard is older and cannot validate the new handoff.

After approved staging setup, bind only staging public URL/anon keys to both candidate apps, set marketing `PUBLIC_APP_URL=http://localhost:5173`, and start the dashboard on that exact origin. `deploy/staging/auth-redirects.json` contains the exact callback/site URLs for the local staging setup. Configure those through Supabase Auth redirect settings only after authorization; avoid broad wildcards. HTTPS preview domains require a separate reviewed origin allowlist change in both code and Auth configuration.

For Google staging tests, configure the staging Google provider with an authorized Google OAuth client and controlled test accounts. The prepared default Google callback is `https://idybpiomulkebvhqibdp.supabase.co/auth/v1/callback`; this is the **Supabase server callback**, distinct from the app's login/signup redirect URLs. Do not paste Google client secrets or Supabase server keys into browser configuration or chat.

Google may display a Supabase hostname because that is the authentication callback service. Review OAuth app display name/homepage/privacy/terms/owned domains in the Google administration console. Replacing the underlying hostname requires an available, configured Supabase custom Auth domain with verified DNS and updated Google callback configuration; code button text alone cannot do that. No production branding/domain setting was changed here.

## Simple supervised test script

Once a working staging preview and controlled test accounts are ready, give the user its exact link and ask them to check:

- Existing member: email login and Google login; reload remains signed in; sign out works.
- Unrelated new email/Google account: no MBPR or other existing rescue workspace opens; its own pending setup screen appears.
- New email account: confirmation message/link works; an already registered address has a safe sign-in/recovery route without disclosing other people's accounts.
- Paid plan choice remains visible after signup/confirmation/Google return, with no false charge or subscription claim.
- Two members from different organizations cannot open each other's workspace; viewer and revoked access behave correctly.
- Switching accounts in the same browser clears old preferences; no second legacy `Use Org ID instead` login appears.

Developer checks include URL/intent allowlists, no cross-origin token forwarding, no role/org/billing authority from metadata, separate signup/sign-in rendering, no-membership vs existing-MBPR rendering and signup intent removal at logout. These local tests are distinct from actual email delivery, Google consent branding, hosted permissions or browser OAuth acceptance.
