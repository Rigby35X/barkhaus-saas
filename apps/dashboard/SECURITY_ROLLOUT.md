# Dashboard identity and organization access

## Implemented

The dashboard uses Supabase Auth for email/password sign-in, persistent sessions, refresh, and sign-out. Existing frontend access codes, default-admin fallback, local legacy sessions, and `?token=` handoffs no longer grant access. The marketing login sends users to the dashboard before credentials are collected, since browser sessions do not cross origins.

Organization choices come from the authenticated-only `my_organization_access` RPC, which derives active memberships from `auth.uid()` and returns allowlisted organization display fields. It does not grant browser access to the legacy organizations table. A saved organization ID is only a preference; an unknown or revoked membership cannot open a workspace. Missing memberships and membership-query errors block the workspace with a retry/sign-out screen. The client reloads memberships on window focus and clears cached animal records across account/organization changes. Selected workspaces remount their tabs, preventing stale modal/filter data from carrying across tenants.

Applications, Communications, Storage uploads, and other Supabase operations share the signed-in SDK client. Application updates and active animal edits also include the selected organization filter. Paid reply/policy endpoints verify the bearer token with Supabase Auth and query the active membership before invoking the provider. Their CORS headers permit Authorization. CORS alone never grants access.

## Intended permissions

This table describes the dashboard policy model, not verified live production enforcement. The additive platform path protects new platform records; it does not retrofit existing applications/content/settings tables. Source metadata shows broad legacy grants and disabled RLS, requiring a separate coordinated cutover.

| Role | Read own org data | Animals/applications/submissions | Website/branding/policies | Organization settings | Manage memberships |
|---|---|---|---|---|---|
| owner | Yes | Create/update/delete | Create/update/delete | Update | Server/admin provisioning only |
| admin | Yes | Create/update/delete | Create/update/delete | Update | Server/admin provisioning only |
| staff | Yes | Create/update/delete | Read | Read | No |
| viewer | Yes | Read | Read | Read | No |

Settings, Integrations, and Policies navigation is limited to owner/admin. Viewers see a view-only banner. Database policies enforce denied writes on the new platform schema; legacy policy enforcement depends on the separate cutover and must not be inferred from UI checks. Animal creation/deletion/saving, application/submission status saving and AI drafting are disabled for viewers. Website saving/uploads require owner/admin; other legacy writes require the separately reviewed database rollout.

## Database rollout — no remote application authorized

Both source and empty staging administrator metadata exports are received. The selected staging reference is `idybpiomulkebvhqibdp`. Review [the staging runbook](../../docs/platform-staging.md), [source findings](../../docs/platform-source-export-review.md) and `deploy/staging/migration-plan.json`; no additional export is needed for current code-level repair.

The prepared platform-only sequence is synthetic staging prerequisites → `202609290000_identity_foundation.sql` → platform migrations `202610260001`, `202610260002`, `202610260003`. It is tested locally, not applied remotely. It creates membership/authorization primitives and new platform tables without altering legacy application-table RLS/grants. Dashboard organization selection now uses the narrow member RPC rather than an unrestricted legacy organization join.

**Exclude `202609290001_dashboard_memberships.sql` and `202609290002_private_data_cutover.sql`.** Stage1 is now only a legacy RLS cutover requiring identity000 first. On the observed source schema, enabling legacy RLS without anon policies would deny existing anonymous reads/submissions, even if table grants are retained. Both cutovers therefore require separately reviewed public projections, validated submission endpoints and MBPR/public-site regressions before any deployment decision. Native/CSV platform preparation is independent of that cutover, but does not resolve existing legacy exposure.

After explicit future staging authorization, use only staging keys and five controlled synthetic Auth accounts, retain exact applied commit/project evidence, and follow the guarded seed/acceptance instructions in the runbook. Signup does not yet create an organization or initial owner. Never trust editable signup metadata for roles or place service-role keys in browser code. No migration, seed, role/user creation, hosted test or deployment is authorized by this document.

## Boundaries still requiring deployment evidence

- Source schema/grants have been inventoried, including the legacy RLS gap. Policy expression semantics, hosted behavior and the safe cutover remain unverified.
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

Historical Agent A instructions below are superseded by the revised platform-only sequence above: v1 now requires additive identity000, not legacy Stage1. Both legacy cutovers are excluded. Administrator-only semantic review and staging evidence remain required. Migration numbering does not authorize applying every file.
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
