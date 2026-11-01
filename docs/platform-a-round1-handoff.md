# Round 1 A: identity/security completion handoff

Implementation baseline: `6c0429d72c904f3f03b7452e911f8f64585e7b44`; shared integration checkout initially at documentation descendant `b9df0fa`. This bounded handoff changes only A-owned files. No worker branch, SQL migration, runtime gate, hosted project or production integration was changed.

## Implemented

- `apps/tenant-site/src/lib/dashboard-auth.ts`: initialization failures now return the same sanitized 503 as provider/membership failures, rather than escaping before the error boundary. Authorization denials always use private/no-store headers and vary on Authorization while retaining existing CORS Vary values. Principal roles use the four-role union; unexpected membership roles cannot authorize a request even if a caller accidentally includes that value in its allowlist.
- `apps/dashboard/tests/server-auth.test.mjs`: adversarial tests cover those boundaries and verify that request-body actor/organization/role values never replace the current verified member principal. Existing private-document, recovery and invitation tests remain passing.
- `scripts/staging/identity-acceptance.mjs`: an explicit, operator-invoked acceptance command for approved isolated staging only. It uses the existing staging config guard, signs in five controlled synthetic accounts, verifies each identity with Auth, checks the active organization display RPC, membership self-read and cross-org denial, and optionally verifies a known private synthetic Storage fixture. Sessions are signed out locally in a finally block. No credentials, record bodies, tokens or signed URLs are printed.
- `apps/dashboard/tests/identity/acceptance.test.mjs`: four offline tests simulate the complete runner, enforce staging-only destinations/request types, ensure cleanup after failures, reject extra organization display fields/cross-org rows and avoid treating a nonexistent authorized fixture as an access-control pass.

## Prepared hosted command — not executed

After separately authorized staging migration/seed and test-account setup, privately configure the existing staging public URL/key/origin fields and these five accounts:

- `BARKHAUS_STAGING_OWNER_A_EMAIL/PASSWORD`
- `BARKHAUS_STAGING_STAFF_A_EMAIL/PASSWORD`
- `BARKHAUS_STAGING_VIEWER_A_EMAIL/PASSWORD`
- `BARKHAUS_STAGING_REVOKED_A_EMAIL/PASSWORD`
- `BARKHAUS_STAGING_OWNER_B_EMAIL/PASSWORD`

Expected seeded memberships: org 1001 owner/staff/viewer plus inactive revoked staff; org 1002 owner. Other memberships make the bounded test fail rather than silently broadening its scope.

For optional private Storage evidence, separately provision an approved harmless synthetic text object in the **private** `animal-private-documents` bucket at exactly `1001/acceptance/identity-fixture.txt`. The runner never uploads or creates that object. Set `BARKHAUS_STAGING_PRIVATE_FIXTURE_PATH=1001/acceptance/identity-fixture.txt`. Owner A/viewer A must sign and fetch it; owner B, revoked A, anonymous signing and the public object path must be denied. A missing authorized object is a failure, not a false passing denial test.

Run `node scripts/staging/identity-acceptance.mjs` only after operator authorization and staging network/access configuration. Without a configured fixture, membership checks run but CLI exits 2 and reports Storage checks outstanding. Errors are sanitized; inspect failures locally, never paste raw credentials/provider bodies into chat. The command performs Auth sign-in/logout, GETs, member RPC reads and signed-URL capability requests; it does not provision users, alter roles, apply SQL, change passwords or write application objects.

Successful completion covers the runner's membership/private-Storage scope only. Recovery/invitation email delivery, Auth expiry/reuse, signed-URL expiration after 60 seconds, role/workload delegation and independent PostgreSQL transactions remain separate hosted checks. It does not establish full Round 1 acceptance or permission to enable the runtime.

## Local evidence

- `node apps/dashboard/tests/server-auth.test.mjs`: **10 pass**, no failures/skips.
- `node --test apps/dashboard/tests/identity/acceptance.test.mjs`: **4 pass**, no failures/skips.
- `node_modules/.bin/tsc -p apps/tenant-site/tsconfig.platform.json`: pass after helper change.

The additive identity migration, narrow organization-access RPC and invitation database logic were reviewed. The source's existing legacy RLS exposure remains a separate cutover; this handoff neither weakens new-platform guards nor claims to repair legacy production permissions. No remote acceptance command was run.
