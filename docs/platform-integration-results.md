# Integration implementation and evidence

Branch: `feature/platform-integration-v1-20261026`.
Base: checklist commit `9bb3cd7dac7d5fc6bebdf071a31e1c5f1fb4010e`, pushed before
integration. All four worker heads were accessible and copied without modifying
their original branches:

| Worker | Preserved head |
| --- | --- |
| A | `0caae5fcf93cf06c6b891e9f4cf155d104cb5257` |
| B | `2e87c526d103583a16a5499fc14f32f0b5a45b3d` |
| C | `e59510673262f428df35e3a4dfc0d4ed92f7c2c5` |
| D / draft PR #7 | `6e144ef1cf33f810adfee771d1690d519f8c15db` |

The coordinator owns cross-module repairs on this dedicated branch, per the
user's explicit handoff. Worker branches and PR #7 are not integration targets.
No merge/deployment/remote migration is authorized by these local results.

## Implementation order and transaction guarantees

1. Reviewed/revised unapplied schema 001/002, then added 003. This preserves
   separate CSV provenance even without an import key, immutable pinned jobs and
   private source storage; adds scoped identities, source history/heads, durable
   inbox/seen/outcome/unit-receipt/outbox storage, and a NOLOGIN/NOBYPASSRLS metadata
   executor. Animal DML still uses member/worker RLS and ownership guards. Native
   IDs remain stable; reviewed numeric adoption remains numeric in DTOs.
2. Implemented `animals/sql-repository.ts`: parameterized PostgreSQL statements,
   physical-column/DTO mapping, locked actor resolution, CAS, scoped identity and
   receipt locks, committed source revision history, and a bound shared writer.
   `postgres-database.ts` holds a single pool connection from SERIALIZABLE BEGIN
   through COMMIT/ROLLBACK; bounded retries cover definite serialization/deadlock
   aborts only. Unknown commit acknowledgements return to receipt-based recovery.
   `sql-authority.ts` derives a member from the existing Auth/membership guard;
   raw request actors are never authentication. Runtime composition stays gated.
3. Connected C's `SqlImportStore`/`commitBatch`: writer, identity bindings, row
   outcomes, authoritative progress, unit receipt and continuation outbox commit
   together. Jobs pin file hash/private UTF-8 source, mapping revision, matching,
   as-of date, definition seal and verified initiating user. Every batch rechecks
   current membership and pins. Earlier committed batches survive later failures.
4. Connected D's `SqlConnectorStore`/`commitPage`: immutable revision-only pre-fetch
   snapshot/inbox, B's writer, source heads/history, outcomes, seen IDs, counts,
   inbox consumption and cursor/checkpoint commit together. Whole-page rollback
   replaces durable partial-row behavior. Empty/stale/unchanged pages use the
   same transaction seam. Lost acknowledgements preserve completed checkpoints.

Connector claim tokens increase monotonically per connection. DB-time expiry,
generation, fence and cancellation are checked under locks. A deferred unit-receipt
constraint rechecks authority at COMMIT, including expiry after the last animal
statement; an expired page cannot leave earlier animal writes committed. Missing
review is bounded to 100 rows per finalization unit, with synthetic continuation
inboxes/checkpoints. Missing animals are never deleted.

Source ownership comes from the immutable mapping in SQL, with unmapped defaults
remaining BarkHaus-owned. Mapped custom fields can be created without dropping
their values. Publish/unpublish/archive are owner/admin-only in service and UI.
Operational photo changes preserve local approval pairs; the public projection
filters exact candidate ID+immutable URL, hiding replacements until approval.

Private bucket fixtures now model required names. Invitation issuer membership
locks are held through issuance/acceptance. Executor role has no animal DML and
no runtime login or browser/service-role membership is provisioned.

## Reproducible validation

Validated with Node 24.19.0/npm 11.9.0 from repository root:

| Command | Evidence |
| --- | --- |
| `npm run test:integration --workspace=apps/dashboard` | 34 tests, including nested SQL checks; all pass, no failures/skips. |
| `npm run test:security --workspace=apps/dashboard` | 41 tests: access 6, actual-SQL RLS 24, server-auth/recovery 7, routes 4; all pass. |
| `node --test --test-concurrency=1 apps/dashboard/tests/animals/*.test.mjs apps/dashboard/tests/imports/*.test.mjs apps/dashboard/tests/connectors/*.test.mjs` | 66 tests pass, including editor role controls, parser/UI, batch/page rollback and replay. |
| `npm --prefix shared/contracts run typecheck` and `npm --prefix shared/contracts test` | Strict typecheck and 13 tests pass. |
| `node_modules/.bin/tsc -p apps/dashboard/tsconfig.app.json --noEmit` | Pass. |
| `node_modules/.bin/tsc -p apps/tenant-site/tsconfig.platform.json` | Strict server/adapter/authority typecheck passes with Astro environment types. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build --workspace=apps/dashboard` | Pass. |
| Same build command for `apps/tenant-site` and `apps/marketing` | Both pass; marketing generates 32 pages. Existing Vercel local Node 24/deployment Node 22 warning remains. |
| `git diff --check` and protected-path comparison to `813d605` | Pass; MBPR public reader/components/layout/detail route and lockfiles unchanged. |

SQL integration tests execute the reviewed migration files and concrete repository
queries in local PGlite/Postgres, including on-disk close/reopen persistence.
They do not imitate the database in JavaScript. Synthetic org 1001 imports native
animals while org 1002 syncs a connector in the SAME database, then both consume
the same private/public interfaces. Tests cover tenant/role/forgery/revocation
denials, deliberate publication, source/local ownership, mapped custom data,
safe numeric identity mapping and unpublished defaults.

Faults are injected at receipt/source-head/source-commit/outcome/seen/checkpoint/
unit-receipt stages and on a second import row. Entire bounded units roll back.
The final-checkpoint and immediately-before-COMMIT lease-expiry tests leave zero
animal/outcome/receipt writes from the failed unit. Retrying after durable commit
with a lost acknowledgement does not duplicate animals, identities or outcomes.
On-disk reopen retains both the animal and its replay receipt.

The pool transport's connection/rollback/retry tests use a pool double. PGlite is
a local PostgreSQL engine with serialized connection execution; neither proves
independent remote-connection contention, real TLS/identity bindings or deployed
Supabase/Storage/Auth/provider behavior. These remain explicit staging checks.

## Runtime and production boundaries

- `services/animals/runtime.ts` still validates/authenticates then returns 503;
  it does not instantiate the SQL adapter or expose the new writer.
- Import/connector adapters are not mounted in production routes; no provider
  transport, queue scheduler, credential resolver or worker host is activated.
- `PostgresDatabase` accepts a reviewed server pool; no pool driver, database
  secret or network grant is installed or auto-selected at runtime. Verified
  member/workload/delegation factories must establish server-owned contexts,
  never deserialize constructors' principals/capabilities from requests/messages.
- New role logins/memberships and credential access are deliberately unconfigured.
  Production DB/payload encryption, retention, workload revocation and secret
  resolution remain operator-reviewed prerequisites.
- All SQL applications in this task were synthetic LOCAL test databases. No
  staging/production migration, cutover, MBPR change or deployment was performed.

## Remaining blockers and next review

Obtain an authorized read-only administrator schema/RLS/grants/Storage export and
an isolated staging project. Review all proposed migrations against that export
before applying them anywhere remote; the legacy organization/FK/defaults and
Storage/API compatibility remain unverified. Then separately approve scoped
server pool/login, workload/delegated-job identity, secret resolver, outbox queue
and supervised worker deployment bindings. Test independent connections, real
two-org HTTP/Auth/Storage expiry, recovery/invitations, browser routing, Cognito
pagination/order/snapshot semantics and rollback in staging. Stage 2 public-site
cutover and production rollout remain separate, unapproved tasks.

Keep PR #7 unmerged. Review this consolidated integration branch instead of
merging worker branches independently. GitHub API access was denied in this
environment; branch publishing works through the existing HTTPS Git proxy.
Draft-PR creation is attempted after publishing; if denied, use the branch compare
link or restore GitHub API access. Do not request duplicate GitHub tokens merely
because the API route is blocked.
