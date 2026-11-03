# Dashboard identity and organization access

## Implemented

The dashboard uses Supabase Auth for email/password sign-in, persistent sessions, refresh, and sign-out. Existing frontend access codes, default-admin fallback, local legacy sessions, and `?token=` handoffs no longer grant access. The marketing login sends users to the dashboard before credentials are collected, since browser sessions do not cross origins.

Organization choices come from active `organization_memberships` joined to `organizations`. A saved organization ID is only a preference; an unknown or revoked membership cannot open a workspace. Missing memberships and membership-query errors block the workspace with a retry/sign-out screen. The client reloads memberships on window focus and clears cached animal records across account/organization changes. Selected workspaces remount their tabs, preventing stale modal/filter data from carrying across tenants.

Applications, Communications, Storage uploads, and other Supabase operations share the signed-in SDK client. Application updates and active animal edits also include the selected organization filter. Paid reply/policy endpoints verify the bearer token with Supabase Auth and query the active membership before invoking the provider. Their CORS headers permit Authorization. CORS alone never grants access.

## Permissions

| Role | Read own org data | Animals/applications/submissions | Website/branding/policies | Organization settings | Manage memberships |
|---|---|---|---|---|---|
| owner | Yes | Create/update/delete | Create/update/delete | Update | Server/admin provisioning only |
| admin | Yes | Create/update/delete | Create/update/delete | Update | Server/admin provisioning only |
| staff | Yes | Create/update/delete | Read | Read | No |
| viewer | Yes | Read | Read | Read | No |

Settings, Integrations, and Policies navigation is limited to owner/admin. Viewers see a view-only banner; database policies enforce denied writes even if someone modifies the UI or makes a direct API request. Animal creation/deletion/saving, application/submission status saving and AI drafting are disabled for viewers. Website saving/uploads require owner/admin; all other writes remain protected by database rules.

## Database rollout

No live Supabase project credentials/connector or exported schema were available during implementation. The migrations are prepared and tested against local Postgres fixtures, not applied to production.

1. Run `supabase/audits/dashboard_permissions.sql` as a database administrator and inspect/export the results. Review the actual schema, every RLS policy, public views, SECURITY DEFINER RPCs, grants, and Storage bucket settings. Reconcile any `organization_memberships` table already present; Stage 1 intentionally fails instead of adopting an unknown schema. Review unexpected tenant tables separately.
2. Use an isolated staging project/branch with representative schema. Apply `202609290001_dashboard_memberships.sql` as postgres. It creates membership-based restrictive policy floors for authenticated requests, so old permissive policies cannot bypass organization/role checks. It retains effective anon grants until Stage 2. Existing anon exposure is still present during this transition.
3. Create/invite the intended user with Supabase Auth. Independently verify their Auth UUID and existing organization ID, then insert the membership from the SQL editor or a trusted server with service-role credentials. Never derive membership or owner role from user-editable signup metadata.

```sql
-- Replace both placeholders with independently verified values before executing.
insert into public.organization_memberships (user_id, org_id, role)
values ('VERIFIED_AUTH_USER_UUID'::uuid, VERIFIED_ORG_ID, 'owner');
```

4. Configure the dashboard's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for that same project. Configure the tenant API project's `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to match. Login routes no longer require the old `/api/auth/*` Xano/Auth0 proxy. Deploy the candidate dashboard and protected API changes to preview/staging and verify email/password login, reload, sign-out, two member organizations, an unknown org, revoked membership, staff, and viewer behavior. Signup alone creates an Auth account; organization creation/initial membership provisioning is not implemented by this change.
5. Before Stage 2, replace the public tenant site's anonymous direct reads with reviewed public projections or trusted server readers that return only public fields and resolve the tenant independently. Move public application/submission inserts to validated server endpoints. Do not put a service-role key in browser code, and do not expose every private field via a public view. The existing MBPR Cognito/proxy animal feed is a separate pipeline, but its Astro page content and branding still use Supabase.
6. Only after those public paths pass staging QA, apply `202609290002_private_data_cutover.sql`. It revokes anonymous table access and denies anonymous animal-images writes. Existing public image delivery remains public when the bucket is configured as public; keep medical records and other sensitive attachments in a separate private bucket with signed access. Audit exposed views/RPCs again, because table RLS does not automatically secure SECURITY DEFINER functions or views.
7. Retest real HTTP requests as anon, user A, user B, and a revoked user against staging; verify no cross-org reads/writes, no viewer edits, no membership self-escalation, and no anonymous sensitive reads or Storage writes. Deploy only after this verification. Do not merge or apply the cutover early.

## Boundaries still requiring deployment evidence

- Production policies/schema/grants are unverified until preflight output is supplied and staging checks run.
- Legacy tenant-site admin endpoints beyond reply/policy generation still need a separate route-by-route audit; this change does not claim the entire historical API surface is secured.
- The migrations cover currently known tenant tables. New tenant tables and views need policies explicitly; creating a new table does not inherit these guards.
- Revoke an account's membership by setting `is_active = false` or deleting the row in a trusted admin/server workflow. Database checks take effect immediately; cached frontend UI rechecks on focus, and unauthorized subsequent writes fail even while a tab is open.
- Rotate any historical credentials or provider keys found in public git history. Removing an access-code login does not erase past commits.

## Platform v1 candidate (Agent A, 2026-10-26)

Contract base `813d605d5465e3b78264a8abd4a9ed790f74f14f`. The additional
`202610260001_platform_v1.sql` and `202610260002_identity_invitation.sql` are local
fixture-tested candidates only. They do not backfill/adopt existing animals,
change MBPR, replace the public reader, or authorize applying Stage 2. See
`docs/platform-a-evidence.md` and `docs/platform-a-interfaces.md` for physical
mapping, SQL capabilities, integration prerequisites and verification limits.

Run both administrator audits before considering these candidates. The v1 schema
requires Stage 1 but can be fixture-tested independently of Stage 2. Migration
number ordering is not permission to apply all migrations: the existing Stage 2
still requires the public-site/submission cutover and staging evidence above.
Never run an indiscriminate remote migration push as part of this assignment.

Recovery UI now requests email with a fixed allowlisted callback, blocks workspace
entry during password reset, validates the Auth user before updating and signs out
on completion. Configure exact Supabase Auth redirect URLs before staging tests.
Auth-server token expiry/reuse and email delivery are unverified locally.
Invitations use hashed random tokens, confirmed matching emails, atomic single-use
acceptance and a current issuer authorization check. Issuance and initial owner
provisioning are administrator-only; signup metadata never grants membership.
The provisioning routine attaches an independently verified Auth user to an
independently verified existing organization, refusing already-provisioned orgs.
Creating organization rows awaits actual schema reconciliation.

Private document URLs are signed for 60 seconds after rechecking membership;
previously issued URLs may remain usable until expiry. Verify actual expiration,
revocation behavior and bucket privacy using isolated staging HTTP. Never put
private attachments into the public animal-images bucket. Candidate migration
fails if the private bucket already exists, forcing review of its configuration.
