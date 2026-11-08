# BarkHaus authentication and tenant-access release

## Scope

Only these Vercel projects are in this release:

- barkhaus-marketing: barkhaus.io.
- barkhaus-admin: app.barkhaus.io.
- barkhaus-public-site: shared rescue websites, including mbpr.preview.barkhaus.io.

Site-0 is explicitly excluded by the user's November 8 instruction. Do not deploy it, change Cognito/animals-proxy, merge to main in a way that triggers its production deployment, or make this release depend on its separate preview branch. The temporary settings added during inspection were moved to fix/site0-access-compatibility preview scope; its production settings and production deployment were preserved.

## Implemented and verified

- Dashboard Google PKCE login, verified organization memberships, session restoration, local logout and immediate Signing out feedback.
- Email registration and login now share the dashboard origin; marketing signup/login route to that origin instead of losing browser sessions across domains.
- A confirmed identity can create its first rescue through create_rescue. The server creates the organization and its owner membership atomically, serializes retries, returns existing management access on retry, and rejects unverified users or existing ordinary members. Callers cannot select the owner, role or existing organization ID.
- Authenticated dashboard requests use the current session JWT; protected API routes verify identity, membership, active organization and hostname scope. Private responses are no-store.
- Shared public-site consumers use fixed read-only public projections. Organization profile contacts/EIN do not become public; explicitly published footer content is the public contact source. Missing data never supplies fabricated MBPR contact details.
- Shared site keeps its existing template. Its header uses the resolved rescue's branding, unknown hosts fail closed, and adoption forms use the resolved organization rather than org 9.
- Public adoption submissions use a server-only credential, a same-origin endpoint, size/contact validation, protected-field filtering and a durable five-per-15-minute quota keyed by a sender/organization hash. No raw client address is stored in the quota table.
- Direct SDK policies and storage policies reject inactive organizations, as well as unauthorized tenant IDs and membership escalation.

Validation: eight regression scripts passed; dashboard TypeScript and dashboard/shared-site/marketing builds passed. Live test-database transactions passed verified onboarding, retry idempotency, denied unverified/member escalation, server-only quotas, and denied inactive-organization reads/writes/uploads. Fixtures were rolled back.

Browser checks using the real account: Google login opened MBPR organization 9, refresh restored it, logout returned to sign-in, and an actual signed-in image upload succeeded. The uploaded test image was not saved to the website; the unsaved editor state was discarded. A brand-new real-account signup/confirmation still requires user interaction and is not claimed as browser-verified.

## Current production state

- Shared public-site compatibility commit 0e1104140408afa7f72b16dc5fff43bfff5a3342 is READY in production (deployment dpl_6aUNKHmqAy2BQh8Mvc4nGVodobPp); *.preview.barkhaus.io remains on that project.
- Public projection, verified onboarding and public application quota migrations are applied to production. These are additive; no production membership was changed.
- Full private-table RLS migration and inactive-organization follow-up are applied in the test database but NOT in production. Production animals, applications, organizations and website_content still lack RLS.
- The new dashboard and marketing authentication release is NOT published. app.barkhaus.io remains on the prior production deployment.
- Google preview: https://barkhaus-admin-git-test-production-go-84b918-rigby35xs-projects.vercel.app/ . Its API override is pinned to the immutable shared-site preview, not a branch alias that can move to production.
- Read-only HTTP checks: shared homepage/listing/footer respond successfully; anonymous protected admin requests return 401.
- Actual live adoption submission was blocked by automatic approval review. A read-only database check confirmed zero release-test applications were inserted.

## Approval required to finish production rollout

Automatic review rejected publishing the dashboard while private-table policies remain unapplied and without authorization for that exact production rollout. It separately rejected inserting a marked test application into the live-backed database. Do not retry through another tool or silently broaden scope.

Prepare and review only the three BarkHaus projects above. Request explicit approval for the coordinated dashboard/marketing deployment, production private-table policies plus inactive follow-up, and ONE clearly marked temporary test adoption application with cleanup. The broad site-0 deployment rejected earlier is no longer part of the proposal.

After approval, capture current production policies/grants, perform the coordinated deployment/policy switch, then verify: owner login/refresh/logout; anonymous and cross-tenant denial; same-value content save/read-back; signed-in image upload; published animal/footer rendering; adoption submission, correct tenant/status and no public application reads. Remove only the uniquely marked release-test application. A Vercel rollback does not reverse database permissions; do not restore anonymous grants as a routine rollback.

Legacy integration callbacks without verified OAuth state/tenant ownership remain fail-closed; this release does not claim Gmail/Google integration onboarding is complete. Keep PR14 draft until the remaining production checks pass. It incorporates PR12/PR13; do not merge all three independently.
