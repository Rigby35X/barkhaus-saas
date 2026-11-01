# Round 1 status: basic animal-management tools

**Plain-language status:** Round 1 is still in progress. The main pieces are built and more of them now work together in a separate local test setup. They are not yet a finished customer experience.

- Login/permissions: built; still need testing in the new Supabase staging project.
- Animal records: create/edit/save/reload works in tests; photo/document uploads and readable change history still need work.
- CSV imports: connected and tested locally; still need the complete browser/staging check and background-job setup.
- Optional connections: controls are built and tested locally; a real configured connection still needs its server setup and staging check. Cognito is MBPR's example, not mandatory onboarding.

**Next:** finish those remaining pieces, test the whole experience in staging, then assess Round 1 completion. Round 2 (organization signup/onboarding, websites and applications) has not started through this work. No production deployment happened. The technical evidence below supports this status; passing component tests does not mean BarkHaus is ready to launch.

Current review branch: `feature/platform-integration-v1-20261026`, [draft PR #11](https://github.com/Rigby35X/barkhaus-saas/pull/11). This is a second implementation pass within Round 1, **not Round 2 and not completion of Round 1**. The original A–D worker branches and PR #7 remain unchanged/unmerged. Native/manual + CSV is the first route to complete; configured Cognito is an optional connected-organization demonstration, never mandatory nonprofit onboarding.

## Work performed

Four bounded implementation assignments ran from implementation baseline `6c0429d72c904f3f03b7452e911f8f64585e7b44` on its documentation descendant `b9df0fa` in the coordinator's shared integration checkout. A separate bounded reviewer implemented actual local PostgreSQL acceptance. This is an explicit integration-branch ownership handoff, not four independently published v2 branches. The coordinator owns publication and the shared changes below.

| Owner | Implemented this pass | Remaining acceptance boundary |
| --- | --- | --- |
| A | Typed verified roles; sanitized Auth initialization failures; private/no-store denial headers; five-account identity/private-Storage acceptance runner with offline tests. | Real Supabase Auth/Storage, invitation/recovery delivery/expiry and least-privilege workload/login delegation. |
| B | Request-scoped SQL animal HTTP composition; concrete `pg` pool with explicit credentials/TLS; browser API origin independent of legacy organization queries; HTTP/SQL/native client regression tests. | Trusted photo upload/finalization, private attachment intake, readable history UI and complete browser/hosted acceptance. Existing editor supports photo ordering/approvals and signed document reads, not full intake. |
| C | Persistent CSV HTTP client; bounded authorized SQL HTTP factory; explicit supervised batch runner; safe input/conflict responses; source-location redaction; template download and recovery by job ID after reload. | Durable deployed delivery/runner binding and browser/hosted acceptance. Start/retry enqueue only; browser never executes import batches. |
| D | Org-scoped SQL/HTTP/client controls; connection panel with saved mapping/status/errors; disconnect/reconnect-review; signed workload verifier; completion/failure timestamps in existing atomic page transactions. | Trusted connection provisioning/mapping changes/activation, real secret/provider transport and durable worker deployment; hosted configured-provider acceptance. Reconnect does not activate or transfer ownership. |
| Coordinator | Native/CSV workspace composition with URL mode recovery; explicit API origin/session adapter; Integrations composition; local same-origin Vite proxy; authorized unavailable routes; combined tests and prepared single-transaction staging bundle. | Final integration/review after remaining features, approved staging access and real UI/Auth/Storage tests. |

A/B/C/D file-level evidence is in `platform-{a,b,c,d}-round1-handoff.md`. The coordinator took ownership of their files on this integration branch, plus App/navigation/tab composition, shared tests/config/manifests and deployment preparation. Additional coordinator tests are `integration/platform-gates.test.mjs`, `integration/workspace-composition.test.mjs`, and `tests/postgres/round1.test.mjs`.

## Runtime and environment boundaries

- Existing animal runtime still returns 503 after authorization. New mounted `/api/v1/imports` and `/api/v1/connectors` routes only validate scope/roles and return 503. They never instantiate a database, job runner or provider. No flag can enable writes through these unavailable-state modules.
- Working animal/import/connector HTTP factories are exercised only by explicit local harnesses. They are not bound to deployed routes. Dashboard UI composition is code prepared for review, not a production deployment.
- `VITE_PLATFORM_API_ORIGIN` explicitly selects a browser API origin; no provider, tenant-preview hostname or legacy organization-table lookup chooses it. The local template uses `http://localhost:5173`, whose Vite development proxy forwards `/api/v1` to local `http://localhost:4321`. This avoids adding wildcard CORS or changing production routing. A future HTTPS staging topology requires its own reviewed same-origin proxy/CORS configuration.
- `createPostgresPersistence` is a real node-postgres transport factory, but it does not load environment variables or establish approved hosted role delegation. No remote database secret or login was configured.
- Both metadata exports are received and reviewed. Staging `idybpiomulkebvhqibdp` remains without application tables/buckets according to its supplied snapshot; it was not changed during this pass. Its HTTPS hostname/TCP access and credentials are not configured in this Cloud environment. Existing runtime variables were not replaced or inspected for secret values.
- Cognito tests use explicit synthetic form `999` in the genuine PostgreSQL suite and in-process responses. No MBPR/Cognito request, customer row read, Shopify change or provider activation occurred.

## Reproduced local evidence

| Command/check | Result |
| --- | --- |
| `npm run test:integration --workspace=apps/dashboard` | 58 tests pass after the workspace-composition tests; actual PGlite SQL, schema/roles, atomicity, staging preparation/export and gated routes. |
| `npm run test:security --workspace=apps/dashboard` | 48 pass: access 6, SQL RLS 24, server authorization 10, routing 4, offline identity acceptance 4. |
| `npm run test:features --workspace=apps/dashboard` | 90 pass: animal 29, CSV 28, connector 33. |
| `BARKHAUS_LOCAL_POSTGRES_TEST=1 npm run test:postgres --workspace=apps/dashboard` | 9 pass against a fresh disposable local PostgreSQL 17, distinct backend connections and real loopback HTTP. |
| Shared contract strict typecheck + tests | Pass; 13 contract tests. |
| Dashboard + platform server strict typechecks | Pass. |
| Dashboard + tenant-site builds | Pass; builds do not enable or deploy any runtime. |
| `node scripts/staging/build-migration-bundle.mjs --check` | Prepared SQL matches the exact allowlist; no SQL executed. |

See [platform-local-postgres-evidence.md](platform-local-postgres-evidence.md) for reproducible independent-connection evidence and limits. Local Auth/workload resolvers are synthetic; local pools use an administrator fixture login. Lost acknowledgement is injected after actual COMMIT, not by dropping a real network packet. Local Storage signers/HTTP mocks do not prove managed Supabase Storage behavior. A local container is stopped after verification; no hosted migration occurred.

The source-shaped synthetic regressions preserve legacy grants/RLS/anonymous reads/submissions; that does not remediate the existing source exposure or replace actual MBPR/public-site regression acceptance.

## Exact remaining path to Round 1 completion

1. Complete native media upload/finalization and private attachment intake through reviewed membership, object ownership and revision checks; add a safe scoped history-read contract/UI. Do not restore the old unguarded upload helper.
2. Finish server-only job delivery/worker entry points and source credential/provider transport bindings. Keep mapping changes/activation explicit and fence old work. Neither imports nor sync should depend on an open browser.
3. Review a specific candidate commit and authorize **staging only** setup separately. The prepared allowlist excludes legacy Stage1/Stage2; no blanket migration push. Single-transaction setup bundle is `deploy/staging/platform-setup.sql`; generator/checker never executes it. It contains no Auth users or seed, and its fresh-project guard refuses existing application objects.
4. Through secure staging-only access, create controlled synthetic accounts, apply the reviewed setup/seed only when authorized, and run actual Auth/Storage/recovery/invitation and least-privilege database/workload tests. Do not send passwords/keys through chat or copy production records.
5. Complete the real browser demonstration: native create/edit/reload/media/history; CSV mapping/preview/fix/retry/recover; deliberate publication/private projection; configured connector replay preserving local fields; two organizations and revoked/viewer/cross-org actors; MBPR unchanged. Only then assess runtime activation/merge and call Round 1 accepted.

Round 2 organization onboarding/website/applications/Sheets remains later work. No approval to merge, deploy, apply remote SQL, provision hosted users or enable production integrations is implied by these local results.

## Login/signup feedback repair

The user's live screenshots were investigated using public artifacts only. The live marketing/dashboard still run older sign-in code. The original MBPR account legitimately should have MBPR access; a different email reached a second old login screen, not proven MBPR access. The candidate now uses one dashboard-origin sign-in/signup flow, Google callbacks on that origin, **Sign up** wording, an optional trial rather than mandatory trial choice, and safe paid-plan preference preservation. New accounts without a membership get a separate pending-organization screen; an existing MBPR membership may open MBPR. No customer account data was accessed to test this.

This fixes candidate authentication entry/handoff behavior, not production. New organization self-provisioning and actual payment checkout are still absent. Google display-name/custom Auth-domain configuration and full real staging login tests remain operator-reviewed dependencies. See [platform-live-login-review.md](platform-live-login-review.md) for evidence and [platform-login-test-plan.md](platform-login-test-plan.md) for simple acceptance steps.
