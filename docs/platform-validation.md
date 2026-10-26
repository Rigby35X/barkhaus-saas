# Coordinator evidence and blockers

Validated 2026-10-26 on branch `feature/platform-contracts-v1-20261026`, based on
requested branch head `73631a4981267226ac7462bd36366c184acff501`. Working tree was
clean before branching. The earlier `5cb19f4` routing changes are included.
Node 24.19.0 / npm 11.9.0. No production writes, migrations or deployment.

## Checks

| Check (repository root unless noted) | Result |
| --- | --- |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | Passed, 854 packages; lockfile unchanged. |
| `npx tsc -p apps/dashboard/tsconfig.app.json --noEmit` | Passed. |
| `npm run test:security --workspace=apps/dashboard` | Passed: access 6, PGlite RLS 11, server-auth 5, routes 4 = 26; no failures/skips. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build --workspace=apps/dashboard` | Passed. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build --workspace=apps/tenant-site` | Passed; Vercel adapter warns local Node 24 differs from deployed Node 22. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build --workspace=apps/marketing` | Passed, 32 static pages. |
| `npm --prefix shared/contracts run typecheck` | Passed, strict v1 contract types. |
| `npm --prefix shared/contracts test` | Passed, 13 contract/policy tests, no failures/skips. |

Baseline application checks ran before additive contract changes; no application
source/manifests/lockfiles/migrations were changed. Contract tests/typecheck ran
after the final contract corrections. Passing tests use SDK mocks and local
Postgres fixtures; they do not prove deployed authentication, RLS or remote data
compatibility. Production builds do not prove live provider functionality.

Contract tests cover two synthetic orgs sharing DTOs, deliberate publication,
exact public allowlist including nested privacy, approved-photo filtering,
cross-org/viewer/source-ownership denial in pure planning, CAS conflicts/overflow,
CSV/connector identity tuples, retry row keys, complete-feed missing review,
legacy aliases/date/status reconciliation, private custom ownership and stable
MBPR public keys. They do not execute persistent imports/sync, a scheduler or a
dashboard editor; those acceptance tests are assigned separately.

## Inventory

- Active dashboard: `src/lib/api.ts` Supabase animal CRUD/cache, optional org in
  some legacy helpers; `tabs/AnimalsTab.tsx` and `AnimalModal.tsx` current editing;
  `components/AnimalForm.tsx`, `MBPRPuppyForm.tsx`, `PawsAnimal*` older variants;
  `src/types/index.ts` has another incompatible Animal shape. Preserve imports
  until B performs a deliberate compatibility migration.
- Schema artifacts: `tables/2_animals.xs` and shared copy are legacy Xano;
  staged membership/private-cutover SQL and administrator audit are in
  `supabase/`. RLS fixtures model minimal animal columns, not a live schema dump.
- Server animal CRUD: `apps/tenant-site/src/pages/api/admin/animals.js` is legacy
  and unsafe for the new service. New authorized code can reuse
  `src/lib/dashboard-auth.ts` only after independently enforcing membership,
  organization, roles, field ownership and atomic persistence at the boundary.
- Imports under `scripts/` are chiefly one-off application imports/backfills,
  with fixed organization/endpoints/local spreadsheet paths. Files named
  `test-api-single.js`, `test-old-date.js`, `test-import-5-entries.js` POST remote
  records; they were inspected, not executed as regression tests. Some legacy
  diagnostics contain embedded provider credentials; they were not reused or
  copied into new code. A must arrange rotation/remediation without breaking MBPR.
- Public MBPR reader: tenant `src/lib/public-animals.ts`, Form 38 animals-proxy
  list/detail, stable `dog-<form>-<entry>` keys, `available-pups/[animalKey].astro`
  and MBPR UI. Existing Shopify assets/links are retained; deployment-side
  Shopify sync ownership is not established by repository inventory.
- Connector-like legacy helpers: Xano/Paragon/OAuth modules and one-off Cognito
  diagnostics are not a durable scoped inbound animal-sync worker. There is no
  tested reusable connector/job system to claim as implemented.

## Remaining blockers and actions

1. **Live schema/access:** read-only Supabase OpenAPI `/rest/v1/` requests returned
   HTTP 401 using both currently present PUBLIC/VITE anon bindings via the
   inherited proxy, with apikey and apikey+Bearer variants. This does not prove a
   missing/invalid secret or justify another token. Verify project binding and
   proxy propagation/access in environment settings, retry, and provide A an
   authorized administrator preflight export. No raw credentials in chat/files.
2. **Staging authorization:** no verified isolated staging DB, migration rollout
   or real two-org users/HTTP evidence. A's Stage 1 retains existing anon access;
   Stage 2 remains gated on public-reader/submission cutover. Do not claim live
   tenant isolation from local fixtures or enable new public/private readers yet.
3. **Persistence integration:** B/C/D must implement runtime JSON validation,
   common writer, durable identities/jobs/idempotency/CAS and owned UI modules.
   Contracts are executable policies/types, not deployed persistence or parsers.
4. **Legacy routes/storage:** the legacy animal API and broader historical routes
   require security audit/replacement; private document policies and real access
   tests are not complete. No production release until reviewed.
5. **Provider operations:** Cognito credential/deployment/scheduler access and
   external Shopify integration ownership need verification before any real sync.
   Local synthetic adapter tests must precede provider testing. Preserve MBPR.
6. **Runtime tooling:** cloud runtime status tool was unavailable in this session;
   local policy snapshot is evidence of configured domains, not live credential
   readiness. Telemetry must be disabled to avoid writing Astro settings outside
   the workspace. Deployment Node version still needs staging parity testing.

Reviewable deliverables are the coordinator commit, shared v1 contracts/tests,
mapping document, and four implementation branch assignments. No PR was pushed,
no environment configuration was changed for this coding task, and no staging or
production readiness is claimed.

## Subsequent integration review

A–D are now running in separate Cloud tasks from this contract commit. Their
observed branch heads, dependency gates, schema/interface review and required
follow-ups are in [platform-integration.md](platform-integration.md). PR #7's 17
connector fixture tests were reproduced, but a separate injected checkpoint
failure left one animal/outcome committed without cursor advancement. The new
page-atomic requirement therefore remains unmet; PR #7 stays unmerged.

A's SQL/evidence and B/C handoffs were reviewed without applying migrations or
enabling runtime adapters. Current Git fetch/PR-page access succeeded; GitHub
GraphQL access was forbidden. The cloud runtime status tool is now available,
but reported policy/variable states do not establish live DB authorization.
Earlier baseline checks and blockers above are historical evidence, not a claim
of current staging readiness. No combined actual-SQL adapter, staging verification
or production rollout is complete.
