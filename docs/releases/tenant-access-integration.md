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

## Database state — do not confuse local tests with live staging

- Production database, memberships, domains, and deployments were NOT changed.
- The previously empty **Barkhaus Staging** project (`idybpiomulkebvhqibdp`) received the schema-only baseline in `supabase/staging/schema.sql`. No production rows were copied.
- The RLS migration has NOT been applied to Supabase staging. The connector confirmation expired twice. Do not bypass this confirmation using execute_sql.
- Isolation tests passed in PGlite (PostgreSQL WASM), with test-only auth.uid() and storage stubs, using fictional organizations/users and transaction rollback. This validates SQL semantics; it does not validate Supabase Auth, PostgREST, Storage API or OAuth configuration.
- Staging bootstrap is a snapshot for this EMPTY staging project only, not a production migration. It already includes organization_memberships. Do not rerun the older membership CREATE TABLE migration on top of this baseline.

## Validation

Run from repository root after `npm ci`:

```
node apps/dashboard/tests/organization-access.test.mjs
node apps/dashboard/tests/website-content.test.mjs
node apps/tenant-site/tests/organization-auth.test.mjs
node apps/tenant-site/tests/middleware-auth.test.mjs
node apps/tenant-site/tests/application-record.test.mjs
node apps/tenant-site/tests/database-access.test.mjs
npx tsc --noEmit --project apps/dashboard/tsconfig.app.json
npm run build --workspace=apps/dashboard
npm run build --workspace=apps/tenant-site
npm run build --workspace=apps/marketing
```

`supabase/tests/tenant_access.sql` can also run as the owner against an otherwise empty staging database AFTER the migration is applied. It creates fictional fixtures inside a rolled-back transaction, never changes production memberships, and is not a browser credential test.

## Required before production approval

1. Complete Supabase's confirmation and apply the two new migrations in timestamp order (public projections, then private-data policies) to Barkhaus Staging. Confirm storage policies and advisors; run the transaction test there.
2. Configure this branch's Vercel previews to use staging URL/public key; server tenant preview needs staging service-role key for application submissions and legacy image upload. Never put that key in VITE_/PUBLIC_ variables or GitHub. Set an explicitly allowed staging dashboard origin for CORS. Set server-only `DASHBOARD_ORIGIN` to the exact staging dashboard origin; middleware owns API CORS. Local tests verify this configurable origin, but browser verification is still required.
3. Configure staging Google provider and exact app return URL. Test Google and email login, session refresh, logout, owner membership, and missing membership against Supabase.
4. Test real API/Storage calls under signed-out, owner A, owner B, read-only member, and unlinked identities. Verify footer save/reload and visible website data. Public animal view must exclude private notes/location; applications must never be publicly readable.
5. Check service integrations intentionally blocked by the new guard. Existing Gmail/Google legacy callbacks do not yet provide verified organization scope; they must remain blocked until OAuth state and credential storage ownership are implemented. Do not remove the guard to make an old callback work.
6. Confirm the public application endpoint has the production service key and tenant resolution. Review abuse controls/rate limits for the public form before launch. Verify no existing external forms depend on direct anonymous database inserts.
7. Production rollout needs TWO phases: apply the first new migration to create public views (without revoking base-table access), deploy verified app consumers, THEN apply the second new migration for RLS/grant/storage changes. Review which Vercel projects share tenant-site; do not assume site-0 alone serves the wildcard domain. No domain reassignment or Cognito/animals-proxy changes are part of this patch.
8. Verify stage-to-production schema drift, back up current policies/grants, and keep the migration transactional. A Vercel rollback alone cannot reverse a database permission change. Do not restore broad anonymous grants as a routine rollback.

This PR is a coordinated implementation candidate, not a production-ready release. Keep #12/#13 open until the integration is reviewed; do not merge all three independently.
