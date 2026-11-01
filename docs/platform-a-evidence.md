# A implementation evidence

Contract base: 813d605d5465e3b78264a8abd4a9ed790f74f14f.
Exclusive ownership and v1 semantics acknowledged. Worktree: /workspace/barkhaus-a.

A1: administrator read-only export adds column, constraint, policy and bucket
metadata inventory. Run with dashboard_permissions.sql; neither export contains
private records. Synthetic fixture is explicitly local only, not a live dump.

Live compatibility, legacy backfills and staging HTTP remain UNVERIFIED.
No administrator export or isolated staging project is available. Current runtime
reports enforced network policy and ready anon variable bindings, but actual
network commands fail connecting to the inherited proxy on port 8080. This is a
transport failure before HTTP, distinct from the coordinator's previous HTTP 401.
No privileged credential was requested or used. Fetch/remote branch inspection
must be retried before pushing; the existing local A branch was at the exact base.

Existing organizations/animals and MBPR remain untouched. V1 uses additive tables;
legacy ID adoption requires reviewed export and explicit mapping, never names.
No migration in this task is approved for remote execution. Stage 2 prerequisites
remain mandatory; Stage 1 retains historical anonymous legacy access.

## Final local validation

- `npm run test:security --workspace=apps/dashboard`: 41 runner tests passed
  (access 6, SQL/RLS 24 including parent tests, server-auth/recovery 7, routes 4),
  no failures/skips. Actual migration SQL runs in PGlite with legacy permissive
  policies plus synthetic organizations 1001 and 1002.
- `npx tsc -p apps/dashboard/tsconfig.app.json --noEmit`: passed.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build --workspace=apps/dashboard`: passed.
- `npm --prefix shared/contracts run typecheck` and `npm --prefix shared/contracts test`:
  passed, unchanged coordinator contract/policy fixture suite.
- `git diff --check`: passed; ownership/MBPR checks compare the final diff to the
  exact base. Manifests, lockfiles, shared contracts and MBPR paths are unchanged.

Checks reused already installed dependencies through untracked temporary worktree
symlinks, removed before handoff. No installs/manifests/lockfile regeneration.
The CAS fixture submits competing statements at one expected revision through
PGlite's serialized connection; one succeeds and the second conflicts. Real
independent-connection contention/MVCC and UI preservation remain B + staging
acceptance, not proven by that fixture. SQL rollback tests prove failed row
outcomes roll back receipt+animal changes when called in one transaction;
exactly-once HTTP replay still depends on B's receipt-first transaction protocol.
Recovery SDK mocks prove redirect allowlisting and failure behavior, not deployed
Auth token verification/reuse, email delivery or actual signed-document expiry.

## Network and publication blockers

Final read-only checks confirm both URL bindings match the expected Supabase
project (without printing credentials). Both anon OpenAPI probes currently fail
before HTTP with a proxy transport error. Previous coordinator HTTP 401 remains
unresolved; no evidence supports a credential replacement. Runtime configuration
readiness does not establish successful API authorization.

Repeated fetch/remote branch inspection and a push dry-run fail with:
`Failed to connect to proxy port 8080 ... Could not connect to server`.
No real push or PR creation was attempted while remote branch work could not be
inspected. Local A began at the exact requested commit; fetched freshness and
remote branch existence are unverified. The commit is preserved on the assigned
branch. Restore managed proxy connectivity, inspect/fetch both remote refs,
review any existing A changes without force pushing, then publish a draft targeting
`feature/platform-contracts-v1-20261026`. A prepared PR body is in platform-a-pr.md.

Remaining integration gates: administrator export and explicit legacy backfill
review; real staging HTTP for anon/two-org/viewer/revoked/worker/document access;
B transactional writer and signed-document route; C namespace/job integration;
D trusted scheduler role/credential resolver; coordinator preview redirect
configuration and signed-in invitation entry point. New-organization row creation
requires verified legacy required columns/defaults; only initial membership of an
independently verified existing org is implemented. No live mutation, remote
migration, deployment or merge occurred. Stage 2 remains gated.

## Exact changed files

- apps/dashboard/SECURITY_ROLLOUT.md
- apps/dashboard/src/components/LoginScreen.tsx
- apps/dashboard/src/features/identity/recovery.ts
- apps/dashboard/src/hooks/useOrganizationSession.ts
- apps/dashboard/tests/rls.test.mjs
- apps/dashboard/tests/server-auth.test.mjs
- apps/tenant-site/src/lib/dashboard-auth.ts
- docs/platform-a-evidence.md
- docs/platform-a-interfaces.md
- docs/platform-a-pr.md
- supabase/audits/platform_v1_fixture.sql
- supabase/audits/platform_v1_preflight.sql
- supabase/migrations/202610260001_platform_v1.sql
- supabase/migrations/202610260002_identity_invitation.sql
