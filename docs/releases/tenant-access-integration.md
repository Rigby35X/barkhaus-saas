# Tenant access integration — release status

Combines PR #12 (`05543d0`) and PR #13 (`b16727c`). Integration branch: `fix/tenant-access-integration`.

## Completed

- Combined Supabase login/membership resolution and footer save/read-back fixes.
- Added explicit organization and verified Supabase identity checks before admin, upload, integration, and content mutation handlers run. Requires owner/admin; authenticated responses are private/no-store.
- Dashboard raw REST, image upload, policy generation, social generation, and reply generation now send the current session token. Other dashboard Supabase SDK queries already use that session.
- Admin REST handlers forward the caller JWT. Animal mutations constrain both record and organization. Website writes reject system-field overrides.
- Added a migration enabling RLS and least-privilege grants on every existing public table. Organization-owned data uses memberships; legacy identity, credential tables and tables without a proven tenant relation fail closed. Organization creation/deletion remains server-only.
- Explicit read-only public projections preserve active organization branding, available animals, and visible content. These intentionally use owner-executed views with fixed column lists and row predicates; do not add private columns or grants without review. There is no public base-table policy.
- Public adoption submissions now use a same-origin, server-only-key endpoint and cannot choose organization/status/internal notes. This fixes the old payload's mismatch with the applications schema.
- Image writes require tenant owner/admin membership and tenant-prefixed paths; reviewed anonymous storage upload policy is removed. Existing public image URLs remain public.
- Retired secret-fragment diagnostic response; removed the tenant Vercel configuration that disabled TLS verification.

## Current staging state

- Full production tenant-access rollout is not applied. Separately, the generic public site's hero/footer/topper rendering fixes were published, and an owner/admin tenant-prefix image INSERT policy was added to production Storage. Existing production membership rows were not changed.
- Both new migrations are applied to Barkhaus Staging (`idybpiomulkebvhqibdp`); all 22 public tables have RLS.
- Private organization email/phone/address/EIN fields are excluded from the public organization view. Website contact data comes only from visible global footer content; profile fields never become public by default.
- Live anonymous HTTP: animals, applications and tokens_table return 401; public_animals and public_website_content return 200.
- Live Supabase transaction tests passed: owner membership isolation, owner insert/read, cross-organization insert rejection, and cleared footer value preservation. Those temporary test users and rows were rolled back. Update/delete and storage-path assertions passed locally; the full live SQL test confirmation expired, so those paths are not claimed as live-verified.
- One persistent fictional organization (`id=9`, BarkHaus Test Rescue) and a visible test footer are staged for browser testing. No production records were copied, and no real user is linked to the test organization yet.
- PR branch-specific preview variables now point dashboard, tenant and marketing at staging; production variables are untouched. VITE_TENANT_API_ORIGIN and PUBLIC_APP_URL keep API calls/login on staging. DASHBOARD_ORIGIN is the exact branch dashboard alias.
- The inherited production service-role key is explicitly disabled on this tenant preview branch. Image uploads now use caller JWT/RLS. The public application-submit endpoint still needs a securely provisioned STAGING service-role key to run; do not copy production's key or put a service key in GitHub, VITE_ or PUBLIC_ variables.
- Staging Google provider is disabled (confirmed via Auth settings API). Email auth is enabled. Provider credentials and URL allowlist cannot be changed through the connected Supabase tools.
- Advisors no longer report public tables without RLS. They flag the three deliberate read-only public projections as definer views; review their fixed column lists/predicates. Eight tables without established client access fail closed with RLS and no client policies. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
- Schema-only staging bootstrap already included organization_memberships. Never rerun the older membership CREATE TABLE migration on top of that baseline.

## Validation

Run from repository root after `npm ci`:

```
node apps/dashboard/tests/organization-access.test.mjs
node apps/dashboard/tests/website-content.test.mjs
node apps/tenant-site/tests/organization-auth.test.mjs
node apps/tenant-site/tests/middleware-auth.test.mjs
node apps/tenant-site/tests/application-record.test.mjs
node apps/tenant-site/tests/published-contact.test.mjs
node apps/tenant-site/tests/database-access.test.mjs
npx tsc --noEmit --project apps/dashboard/tsconfig.app.json
npm run build --workspace=apps/dashboard
npm run build --workspace=apps/tenant-site
npm run build --workspace=apps/marketing
```

`supabase/tests/tenant_access.sql` can also run as the owner against an otherwise empty staging database AFTER the migration is applied. It creates fictional fixtures inside a rolled-back transaction, never changes production memberships, and is not a browser credential test.

## Required before production approval

1. In Supabase **Barkhaus Staging > Authentication > Sign In / Providers > Google**, configure and enable Google. In Google Cloud, authorize the staging Supabase callback: `https://idybpiomulkebvhqibdp.supabase.co/auth/v1/callback`. Never paste the client secret in chat.
2. In staging **Authentication > URL Configuration**, set Site URL and allow the exact dashboard branch origin: `https://barkhaus-admin-git-fix-tenant-access-b4649f-rigby35xs-projects.vercel.app`. This implementation returns PKCE login to the origin root. Do not change production auth settings or allow arbitrary preview domains.
3. Sign into staging with the intended owner account. Verify the resulting staging identity, then link only that identity to the fictional test organization for the browser test. Production membership does not automatically carry across projects.
4. Browser-test Google/email login, session refresh/logout, footer save/reload/public display and image uploads. Test requests under owner A/B, member and unlinked identities. Do not call a build success end-to-end verification.
5. Provision the server-only staging service key and the staging animal-images bucket before public application submission testing. Test submission, no public application reads, and rate/abuse controls. Existing Google/Gmail integration callbacks without verified tenant scope intentionally remain blocked pending separate OAuth-state/credential ownership work.
6. Confirm current domain/project mappings and which projects share tenant-site. Cognito/animals-proxy settings and domain assignments are not changed by this patch.
7. Production rollout requires TWO phases: first new migration (public projections), compatible app consumers, then second new migration (private data/storage policies). Review schema drift and back up policies/grants. Vercel rollback alone cannot reverse database permission changes; do not restore anonymous grants as a routine rollback.

Keep PR #14 draft until these checks pass. It incorporates #12/#13; do not merge all three independently.

## November 7 auth release verification

Existing-account pilot uses the production Supabase Auth project and real MBPR membership in the dashboard preview, not staging:
https://barkhaus-admin-git-test-production-go-84b918-rigby35xs-projects.vercel.app/

- Browser Google PKCE return completed and opened Mission Bay Puppy Rescue, organization 9. Repeated sign-in also passed.
- Refresh restored the correct organization and dashboard. Logout reached the sign-in page; reloading after logout stayed signed out.
- Logout after restored sessions was slow. Added an immediate Signing out status that unmounts the private dashboard while the existing local-scope SDK sign-out completes; failures keep retry/sign-out available.
- Seven repository regression scripts passed, covering membership verification/unlinked users, organization isolation, middleware authorization, SQL policies/public projections, application protected fields and footer saves. These automated unlinked-user assertions are not a real new-account signup browser test.
- Dashboard TypeScript and production build passed. Preview commit with logout feedback: e67c51ab58fd52e32881c030126a7cd33202d475.
- Read-only production check reconfirmed RLS is enabled on organization_memberships but disabled on animals, applications, organizations and website_content. Auth success alone does not enforce data isolation there.
- app.barkhaus.io remains on the earlier production dashboard; no dashboard promotion or production table-policy migration was performed in this verification.

### Remaining concrete release dependencies

1. Validate a real unlinked Google identity shows the no-membership screen and never creates/joins MBPR automatically. Self-service organization provisioning is not implemented by the login gate; decide/review that separately from an existing-member pilot.
2. Update the currently deployed generic barkhaus-public-site consumers to the public projections and authenticated API contract before enabling private-table RLS. Its deployed baseline differs from site-0/main. Do not publish the redesigned site-0 template over the shared generic site or assume PR14's tenant build replaces both safely.
3. Verify actual image upload and adoption submission against the compatible endpoint deployment. The staged application endpoint still needs its own server-only staging key if staging is used; never use the production service key there.
4. Apply the two-phase production rollout only with the corresponding public consumers and protected API deployment ready. Verify owner, unlinked and cross-tenant access after the switch. Vercel rollback does not undo database permissions.

Status: existing-member Google login verified; general signup and combined production release remain blocked on the dependencies above. Keep PR14 draft.
