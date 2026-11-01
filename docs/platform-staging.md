# PR #11 review and isolated staging preparation

Prepared for [draft PR #11](https://github.com/Rigby35X/barkhaus-saas/pull/11). No remote migration, deployment, merge or production configuration change is authorized by this document. PR #7 also stays unmerged. Existing MBPR integration remains unchanged.

## Review findings and disposition

- GitHub supplied a merge commit for PR #11 with coordinator target `9bb3cd7dac7d5fc6bebdf071a31e1c5f1fb4010e`. Local `git merge-tree --write-tree` also found no conflicts. This checks Git compatibility; it does not establish passing hosted CI or permission to merge.
- Fixed connector lease reaping that could reset an already completed page after commit but before lease release. Terminal status and committed cursor now survive expiry and replay.
- Removed inherited `service_role` platform-table access from Supabase default ACLs. BYPASSRLS makes removing table privileges necessary. Local fixtures now model hosted defaults.
- Removed direct authenticated animal INSERT/UPDATE privileges, which bypassed writer validation and receipts. Trusted member writes use a dedicated `barkhaus_native_writer` NOLOGIN/NOBYPASSRLS role, with membership RLS. No runtime login or role membership is provisioned. Metadata executor has no animal write privilege; connector role remains scoped.
- Runtime authenticates and authorizes before returning 503. SQL pool factories, workload identity, secret resolution and import/connector HTTP/queue bindings remain deployment prerequisites. No environment variable in the staging template enables writes.

## Selected staging project

The user supplied staging project reference `idybpiomulkebvhqibdp`, distinct from production. Its expected HTTPS API URL is `https://idybpiomulkebvhqibdp.supabase.co`; the blank-key configuration template now contains this nonsecret reference/URL. Project identity/emptiness has not yet been independently verified. Next evidence: run the same read-only schema export in this project and label its output `staging-empty-schema-export`.

The current Cloud environment does not allow this staging HTTPS hostname and has no database secret binding or TCP grant. Existing runtime values are not evidence of staging configuration. No network rule, credential, runtime setting or hosted project was changed when recording the reference. Keep all migration/seed/runtime gates in place; source-review blockers still apply.

## 1. Export administrator metadata, read-only

1. In Supabase Dashboard, select the **existing source project**. Verify its project reference in Project Settings; do not use a customer dashboard account.
2. Open SQL Editor as an authorized project administrator. Create a new query and paste **the complete contents of `supabase/audits/staging_schema_export.sql`**. It is one SELECT; run exactly that query. Do not run migrations, fixtures or older audit scripts.
3. Download the single `barkhaus_schema_export` JSON cell (CSV containing that cell is also acceptable). Label it `source-schema-export.json`, and send it through the agreed private review channel. Repeat in the new empty staging project and label that result separately.
4. No application/customer records, auth users/sessions, object listings, Vault values, passwords, keys or connection strings are selected. The query inventories relations, columns, constraints, indexes, policy names/roles/commands, ACLs/default ACLs, role memberships, routine/trigger/view metadata, extension versions and bucket settings.
5. Arbitrary SQL expressions can embed secrets. Therefore defaults, policy predicates, function/view bodies and constraint definitions are represented by fingerprints, not raw text. This is a safe inventory, **not a restorable schema dump**. An administrator must inspect the existing policy predicates/functions locally before compatibility approval; fingerprints cannot prove their semantics. Do not share raw function bodies or a blanket `pg_dump` without reviewing literals. Never export customer table contents.

The script is tested inside a PostgreSQL read-only transaction. For additional enforcement with an already configured secure `psql` connection, use `PGOPTIONS='-c default_transaction_read_only=on' psql -X -v ON_ERROR_STOP=1 -At -f supabase/audits/staging_schema_export.sql > source-schema-export.json`. Supply connection credentials through a private password file/secret binding; never paste a password-bearing URL into chat or shell history. SQL Editor's single SELECT does not alter the project.

## 2. Create a separate staging project

1. In the correct Supabase organization, choose **New project**, name it `BarkHaus Staging`, choose an appropriate region and a unique strong database password stored in your password manager. Record the new project reference. Do not restore, branch or clone production data, Auth, Storage or integrations.
2. Confirm the reference differs from production `vycwqnsjhwviryfrdwfr`. Keep project access limited to the staging administrators; use personal accounts with MFA. Share access through Supabase organization/project controls, never by sending administrator credentials.
3. Keep the project empty. Do not connect MBPR, Cognito, webhooks, scheduled syncs or production storage. Do not copy production environment files. Keep all proposed worker/provider bindings disabled.
4. For initial local gated tests, set Auth Site URL to `http://localhost:5173` and allow the exact recovery redirect `http://localhost:5173/?identity=recovery`. Do not allow production redirects or broad wildcard preview URLs. Any HTTPS preview needs a separately reviewed exact origin in both Supabase and the application's redirect allowlist.
5. Through Authentication → Users, create five controlled synthetic accounts: owner A, staff A, viewer A, revoked A and owner B. Use separate strong passwords, confirm accounts through administrator controls and retain credentials privately. No customer invitations. Record their five nonsecret UUIDs for the seed; do not write `auth.users` directly.
6. Export the empty staging metadata using step 1. Return the source/staging exports and the staging project reference for compatibility review **before running any migration**.

## 3. Configure access without enabling runtime writes

Use `deploy/staging/.env.example` as a blank template in a separate staging secret/environment configuration. Set both public Supabase URLs to `https://<staging-ref>.supabase.co` and both anon-key fields to that staging project's browser-safe anon key. Never use a service-role key in `VITE_*` or `PUBLIC_*`. Public keys are not database administrator credentials.

Set the explicit project reference, application/API origins and `BARKHAUS_STAGING_RUNTIME_MODE=gated`. Keep synthetic test passwords in server-only secret bindings. Run `node scripts/staging/check-config.mjs` with those bindings loaded; it prints no credentials. Do not load inherited production values. The current cloud network allowlist must separately permit the new staging HTTPS hostname; database TCP access is currently unconfigured. Ask for only the staging destination through the environment configuration workflow.

Start the dashboard and tenant API locally with the staging-only environment (`npm run dev --workspace=apps/dashboard` and `npm run dev --workspace=apps/tenant-site -- --port 4321`). These processes must receive the same validated staging configuration. Do not deploy either to production. No SQL login is needed for the gated HTTP checks. A future PostgreSQL pool login must be server-only, use TLS and reviewed least-privilege group membership; do not use a browser JWT, service-role HTTP key or proxy placeholder as a SQL password. No login/grant provisioning is included here.

## 4. Proposed migration sequence — BLOCKED by source review

**Do not run this sequence yet.** The supplied source export now shows that Stage 1 would enable legacy-table RLS without anon policies and could interrupt the existing public site/submissions. See [platform-source-export-review.md](platform-source-export-review.md). Resolve that compatibility/cutover design before authorizing this sequence; the sequence below is a historical proposal, not an approved plan. Also review both exports, administrator-only policy semantics, project reference and role/grant compatibility. Record approval against a specific integration commit. Never use blanket `supabase db push` for this branch.

On the new staging project only, execute and retain results in this exact order after approval:

1. `supabase/staging/000_public_prerequisites.sql` — synthetic public legacy prerequisites only; refuses existing application objects. It does not recreate Supabase-managed auth/storage/roles.
2. `supabase/migrations/202609290001_dashboard_memberships.sql` — Stage1 memberships and policies.
3. `supabase/migrations/202610260001_platform_v1.sql` — additive canonical platform schema.
4. `supabase/migrations/202610260002_identity_invitation.sql` — invitation issuance/acceptance authorization.
5. `supabase/migrations/202610260003_transactional_ingestion.sql` — transactional ingestion and trusted roles.
6. Make a private local copy of `supabase/staging/020_synthetic_seed.sql`, replace all five UUID placeholders with the staging Auth UUIDs and run that copy. It creates only organizations 1001/1002 and synthetic memberships, and refuses existing application rows.
7. Run `supabase/staging/030_acceptance_readonly.sql` and the safe metadata export again; preserve outputs with the exact applied commit and project reference.

**Exclude `202609290002_private_data_cutover.sql` (Stage2)** until public-reader/submission cutover is separately approved. Never run `supabase/audits/platform_v1_fixture.sql` on hosted Supabase; it creates local substitutes for managed infrastructure. Stop on any error and record it; do not weaken grants/RLS to proceed. Recover by recreating this disposable staging project and repeating the reviewed sequence, rather than applying destructive rollback SQL or touching production.

The synthetic prerequisite schema is deliberately minimal. Passing it does not prove compatibility with actual production schema or existing public submission policies.

## 5. Acceptance evidence and remaining gates

Locally run:

- `npm run test:integration --workspace=apps/dashboard` — actual PGlite SQL for native writer, two organizations, source ownership, CSV batches, connector pages, atomic checkpoints, deferred authorization, lost commit acknowledgement/replay, role grants and staging preparation/export.
- `npm run test:security --workspace=apps/dashboard` and existing feature/contract suites recorded in `platform-integration-results.md`.
- `node_modules/.bin/tsc -p apps/tenant-site/tsconfig.platform.json` and dashboard typecheck.

Prepared synthetic inputs are in `deploy/staging/fixtures/`: CSV includes a quoted name and invalid row, with a corrected counterpart; native mapping pins revision 1; connector page uses a synthetic numeric entry ID and no external photo URLs. They must be supplied through test harnesses, never a live provider or MBPR credentials. Import jobs must pin original file/mapping/matching configuration; an edited correction requires a new job/file seal.

After the approved staging migration/seed, `node scripts/staging/gated-http-smoke.mjs` uses only synthetic Auth accounts and GET requests: unauthenticated 401, authorized owner/viewer 503 while gated, other-organization and revoked member 403. It does not prove durable writes and must not enable the runtime to make those requests pass.

Before enabling any staging write runtime, separately provision/review the real SQL pool transport, role delegation and source-scoped worker identity, then run the combined persistence suite against **independent PostgreSQL connections**: both organizations; owner/staff/viewer/revoked actors; cross-org/source attempts; native create/update CAS; publish/photo guards; CSV checkpoint failure rollback; connector page checkpoint failure rollback; COMMIT acknowledgement loss followed by replay with one receipt/outcome/identity and unchanged authoritative progress; stale lease/fence/generation rejection; expiry after completed page without rewinding completion; membership revocation before commit; private storage denial. PGlite and pool doubles do not replace hosted MVCC/connection evidence. Keep gates enabled until those results and a separately reviewed runtime binding exist.

Outstanding: administrator metadata/semantic compatibility review, empty staging project/access, actual staging migrations (not applied), hosted Auth/RLS/storage and independent-connection persistence tests, secret/workload/pool provisioning and a separate runtime enablement decision. No customer data or production integration is needed for these tests.
