# Integration checklist and dependency decisions

## Execution update and ownership handoff

The user authorized coordinator ownership of the affected A/B/C/D files on
`feature/platform-integration-v1-20261026`. This supersedes worker-exclusive file
ownership **on this integration branch only**. Original worker branches remain
unchanged. Checklist commit `9bb3cd7` was pushed to the coordinator branch first;
all four exact worker heads below were fetched and copied to the integration
branch without merging any GitHub PR. B/C/D code was initially copied with its
runtime gates intact; physical integration proceeded after schema review and the
first actual-SQL writer tests passed.

Bounded delegation on this shared integration checkout: a schema reviewer repaired
SQL/fixtures; separate assignments repaired C's batch port/SQL store and D's page
port. The coordinator implemented B's SQL repository/transport and D's SQL store,
reviewed cross-module changes, and owns the consolidated tests and result report.
No delegate switched, pushed or modified a worker branch.

Completed local gates: G0 ownership handoff, G1 reviewed SQL foundation, G2 concrete
transaction-bound writer, G3-C batch persistence, and G3-D page persistence.
Combined two-org SQL/authorization tests and all application builds pass. G4's
interactive browser history/live HTTP checks, G5 staging and G6 PR merge approval
remain outstanding. PR #7 stays unmerged; runtime HTTP stays 503-gated, provider
and scheduler integrations remain disabled, and remote migrations remain unapplied.

The initial review/findings below are preserved as history. Their missing-adapter
and atomicity failures are resolved locally by this branch; deployment prerequisites
are not. See [implementation and test evidence](platform-integration-results.md)
for current commands, guarantees and remaining blockers.

Coordinator review: 2026-10-26. Contract base:
`813d605d5465e3b78264a8abd4a9ed790f74f14f`.
This is a review and follow-up plan, not an approval to apply SQL, enable routes,
merge PRs, deploy workers or change production/MBPR.

## Reviewed inputs and dependency tracker

| Owner | Observed revision | Evidence | Integration state |
| --- | --- | --- | --- |
| A | `0caae5fcf93cf06c6b891e9f4cf155d104cb5257` | `docs/platform-a-{interfaces,evidence}.md`, migrations `202610260001_platform_v1.sql`, `202610260002_identity_invitation.sql`, preflight/fixtures | Reviewed; schema corrections and trusted execution capability requested; NOT approved for application. |
| B | `2e87c526d103583a16a5499fc14f32f0b5a45b3d` | `docs/platform-b-native-animals.md`, animal service/repository/index/runtime | Interface implementation only; concrete transactional persistence and policy reconciliation blocked on A+B follow-up. |
| C | `e59510673262f428df35e3a4dfc0d4ed92f7c2c5` | `docs/platform-c-csv-onboarding.md`, import service/store ports | Pinned-input orchestration ready for review; NOT connected to persistence. |
| D | `6e144ef1cf33f810adfee771d1690d519f8c15db` | [draft PR #7](https://github.com/Rigby35X/barkhaus-saas/pull/7), connector ports/worker, handoff and deployment README | 17 fixture tests reproduced; atomic page/checkpoint requirement fails adversarial check. KEEP UNMERGED. |

The observed Git refs all retain the contract base. These are immutable review
revisions, not a guarantee they remain remote tips. Fetch/recheck exact PR heads
before integration. GitHub GraphQL access was forbidden; the PR handoff was read
from the GitHub page and code from `refs/pull/7/head`. A/B/C published branches
were discovered read-only; their supplied PR links/final handoffs are still awaited.

Ordered gates (unchecked means outstanding):

- [ ] G0: A/B/C/D acknowledge these transaction and schema decisions; coordinator
  records follow-up commits and confirms exclusive file ownership.
- [ ] G1: A corrects/reissues additive schema, preflight and realistic fixtures;
  coordinator reviews both migrations, grants, triggers and new execution surface.
- [ ] G2: A+B deliver a least-privilege DB transaction adapter plus verified actor
  resolution. Integrate A's reviewed foundation, then B's writer on a local
  integration branch. Pass actual-SQL writer/policy/rollback tests before wiring
  import/connector entry points. Neither independent fixture suite meets this gate.
- [ ] G3-C: C consumes the approved pinned-job/batch adapter and B writer; pass
  durable import/retry and shared transaction tests.
- [ ] G3-D: D changes page atomicity and consumes the same adapter/writer; pass
  checkpoint failure, stale lease, replay and source ordering tests on actual SQL.
- [ ] G4: coordinator composes module navigation and runs combined synthetic
  org 1001 native/CSV and org 1002 connected acceptance, typechecks, security suites,
  all app builds, routing/history and unchanged MBPR-path checks.
- [ ] G5: authorized administrator export and isolated staging configuration;
  review schema compatibility and every proposed migration before application.
  Real staging DB/HTTP/Storage/Auth/provider checks remain OUTSTANDING.
- [ ] G6: review corrected PR #7 and final A/B/C evidence at pinned SHAs. Merge
  only after applicable integration tests pass and review approval is recorded.
  Production rollout and Stage 2 cutover remain separate work.

No incoming branch has been merged or cherry-picked in this review. No migration
was executed, including in a local database. A's reported fixture results below
are evidence reviewed, not tests rerun by the coordinator.

## Mandatory transaction boundary

Use B's existing `withAnimalTransaction(repository, (writer, tx) => ...)` seam.
Its bound writer reuses the concrete `AnimalTransaction`; it must not allocate a
second connection, commit early, call a remote writer endpoint or open a nested
independent transaction. A supplies reviewed SQL/grants/constraints; B owns the
server-only concrete repository adapter. C/D own their orchestration/store facades,
delegating to that adapter. C/D must not implement another animal writer.

The target is one trusted PostgreSQL connection/transaction per bounded connector
page or CSV batch, with B's TypeScript validation/policy running on its bound
writer. A server-side DB transport is a required deployment prerequisite; the
current anon/service-role REST clients do not supply this callback transaction.
Coordinator reviews any driver/dependency request. If the deployment cannot
provide this transport, STOP and return for review of a single atomic SQL/RPC
design; do not simulate transactions with sequential Supabase REST requests.
No new login credential, role membership or network grant is created by this plan.

Inside the SAME database transaction:

1. Lock/revalidate the authenticated principal or delegated import-job authority,
   org/connection/job, mapping/config generation, cancellation, DB-clock lease
   expiry and monotonic fence. Hold the relevant membership/connection locks
   through commit; checking before the transaction is insufficient. A+B document
   a fixed lock order, identity/receipt namespace locks and bounded contention retry.
2. Verify immutable inbox/file digest, job definition and mapping revision; read
   committed row/page outcomes and receipts before mutation. Expected animal CAS
   comes from the pinned snapshot/review decision, never an opportunistic reload
   that silently replaces it.
3. Call the bound B writer for all accepted commands. Persist animal rows, scoped
   identities, revisions, source revision/digest history and successful receipts.
4. Persist row outcomes (including rejected/unchanged/stale), seen identities,
   durable counts and the batch/page completion marker.
5. Advance the authoritative cursor/progress checkpoint and consume the inbox
   ONLY if all rows in this bounded unit have outcomes. A terminal verified full
   snapshot may update missing-review state and finalization progress atomically;
   large missing-review scans need bounded finalization units with their own
   checkpoints, not an unbounded transaction. No deletion.
6. Commit once. Any failure in steps 1–5 rolls back ALL writes in this unit,
   including receipts, outcomes and checkpoint. A commit acknowledgement lost
   after success is resolved by reading the durable unit receipt; replay does not
   create duplicates. Earlier committed pages/batches remain committed.

Provider fetch/normalization, immutable source-object storage and durable inbox
preparation occur outside the animal mutation transaction. Persisting an inbox
early is permitted because it changes no animal. Queue notifications use a durable
outbox written with the corresponding enqueue/checkpoint transaction and delivered
after commit. Retry/failure state may be recorded in a separate fenced transaction
only AFTER the entire failed page/batch has rolled back.

### D's required port change

At PR head `6e144ef`, `worker.ts:61–89` commits per-record `store.transaction`,
then `:92` calls `store.checkpoint` outside it. `ports.ts:33–38` exposes that split.
The test at `connectors.test.mjs:37–40` explicitly expects a first-row commit
before a second-row failure. That is not the required page-atomic behavior.

Replace this production path with a bounded page transaction, for example:

```ts
store.commitPage(lease, expectedInboxDigest, async pageTx => {
  // pageTx.writer is B's writer bound to this exact transaction.
  // Existing source ordering/CAS logic stays inside this callback.
  for (const row of pinnedInbox.records) {
    await applySourceRow(pageTx, row); // writer + source head + row outcome
  }
  await pageTx.checkpoint(); // still inside the SAME callback/DB transaction
});
```

`commitPage` resolves only after durable commit. `checkpoint` must not remain a
standalone committing store operation. Empty/stale/unchanged pages still commit
their outcomes/seen IDs/checkpoint together. A page retry after rollback uses the
same immutable inbox; it cannot skip a row that never committed. If a provider page
is too large, reduce page size or add an explicit bounded subpage checkpoint that
commits atomically with that subpage, and obtain coordinator review first.

### C's required progress change

Current `JobSession.row` commits writer/identity/outcome per row, while
`runBatch` calls `saveProgress` later (`service.ts:129–158`). Introduce a bounded
`commitBatch` facade on B's shared transaction adapter and move authoritative
progress/checkpoint writes inside it. A rejection is a durable outcome; a DB,
authorization or invariant failure rolls back this entire batch. Partial jobs
represent earlier committed batches, not a half-committed batch. UI counters are
derived from outcomes; a later best-effort summary cannot serve as a checkpoint.

## A — precise schema and authorization follow-up

Retain ownership of `supabase/migrations/**`, `supabase/audits/**` and the existing
A auth/helper files. Do not edit B/C/D modules. Submit a small additive foundation
correction and interface/grant manifest before any application of SQL.

1. **Pinning and provenance:** `platform_jobs` must store immutable CSV matching
   decisions, as-of date, source object reference+SHA-256, definition seal, creating
   verified principal and mapping ID/revision. Separate CSV origin job/mapping
   provenance from optional stable-key identity: `platform_animals` currently has
   no origin job FK, and `(import_mapping_id is null)=(import_key is null)` loses
   create-only/reviewed `{jobId,mappingId,importKey:null}`. Use same-org pinned-job
   references; keep namespace uniqueness `(org_id,mapping_id,import_key)` for keys.
   Preserve provenance on subsequent edits. Do not invent a numeric legacy ID
   adoption/backfill without administrator schema export.
2. **D storage:** extend the current foundation with durable connection/config/
   credential generations, job lease owner/fence/DB-time expiry, attempts/retry
   timing/cancellation, immutable normalized inbox+digest+pre-fetch revisions,
   cursor history, seen IDs, unit outcomes/counts and transactional outbox.
   Support `queued/running/retry_wait/completed/failed` plus cancellation and CSV
   partial state; the current `pending/running/completed/failed/cancelled` check
   needs an explicit mapping or revision. Enforce one active connection lease
   across jobs, not merely one `status='running'` row. Pin generations/mapping
   for retries and reject changed request-key payloads.
3. **Source history:** `platform_source_commits` stores digests, but B needs opaque
   committed revision history and D needs a locked latest `{revision,digest}`
   head. Add an explicit source revision/history/head representation with same-org
   connection/job/animal FKs. Keep source payload digest (D's normalized fields +
   custom values), B command/receipt digest and C definition/file digests distinct.
   Do not repurpose a digest as an ordered revision. Cognito timestamp ordering is
   permitted only after provider verification; other providers need their own rule.
4. **Scoped execution:** supply a narrowly granted server transaction capability
   and actor resolver returning verified Auth UUID/org/current role. Current
   `requireOrganizationAccess` returns only a client. Browser bodies/queue messages
   cannot set actor, DB role or `barkhaus.worker_*`. The worker role currently has
   only animal-table access; jobs/ledgers/credentials have no usable execution
   capability. Specify exactly which reviewed functions/role transitions allow
   the trusted adapter to persist metadata on the same connection. Keep RLS,
   actor revalidation and fences; no blanket BYPASSRLS/service-role grants.
5. **Delegated import authority:** enqueue must record authority issued after
   real Auth verification, bound to immutable org/job/definition/initiator. A
   trusted queue-runner proof may consume only this delegation and must recheck
   initiating membership inside each batch. Do not store browser refresh/access
   tokens or accept an arbitrary UUID as proof. B/C can retain member WriteActor
   shape while resolving it from that verified server-only delegation.
6. **Mapped ownership/custom fields:** SQL currently requires every core field
   connector-owned and forbids all source custom values/owners on INSERT. Replace
   that with verified pinned-mapping ownership: mapped core keys plus mapped
   lifecycle/availability belong to the connection; unmapped defaults belong to
   BarkHaus. Allow mapped custom values only with server-registered exact owners.
   Connector requests cannot register ownership themselves. Test with D's actual
   `Kennel -> custom.kennel` fixture and a locally editable unmapped biography.
7. **Photos/publication:** preserve local approval pairs unchanged on operational
   photo edits. B must stop automatic approval pruning (see B below); do not relax
   the worker guard to permit granting approvals. Owner/admin controls all
   publish/unpublish/archive and approval changes. Keep immutable approved photo
   content/URL metadata and exact-ID+URL public filtering.
8. **Migration realism:** reconcile `storage.buckets` required columns; the
   migration currently inserts `(id,public)` and the fixture models only those,
   while standard Supabase schemas also require `name`. Review full preflight
   before deciding actual insert shape. Fixtures must catch this discrepancy.
   Both new migrations remain unapproved for remote execution. Invitation
   acceptance locks the invitation but not the issuer membership: add/test a
   revocation-safe membership check held through acceptance commit; define the
   corresponding issuance locking too. Keep provisioning/invitation issuance
   unavailable to arbitrary browser/service-role calls.

Required A evidence: corrected actual-SQL fixture tests for every requested FK,
role/grant/ownership/provenance rule, fencing and job immutability; realistic Storage
schema; migration-by-migration preconditions, grants, rollback/forward recovery and
no legacy exposure expansion. Real independent-connection contention and deployed
Auth/Storage behavior remain staging checks, not PGlite claims.

## B — precise transactional writer follow-up

Keep exclusive ownership of animal service/repository/HTTP/UI files. Consume A's
reviewed physical columns, without another SQL schema or worker-specific CRUD API.

1. Implement the concrete server-only transaction adapter with A's execution
   capability. All `AnimalTransaction` calls and C/D facades share one transaction
   handle, locks and durable commit. Keep `runtime.ts`'s 503 gate until this exists
   and integration tests pass. Do not bind a freely claimed WriteActor; derive it
   from verified session, connection-scoped workload capability or delegated job.
2. Map `fields` JSON separately from SQL `photos/lifecycle/availability`; combine
   `custom_fields` values with `custom_owners`, documents by kind, notes and
   publication/approvals on read. Native empty ownership expands to BarkHaus.
   Preserve numeric `legacy_animal_id` DTOs when adoption is explicitly reviewed;
   keep a lossless internal text-ID lookup and no name-based identity.
3. Preserve full CSV origin independent of a stable key. Bind imports via the
   separate scoped identity store. For every import update, verify the ambient
   pinned-job context in the same transaction, including `edit_native` (v1 edit
   carries no job metadata); HTTP callers cannot fabricate this context.
4. Align all publication-state mutations (`publish`, `unpublish`, `archive`) with
   A's owner/admin policy in service, editor controls and tests. Staff operational
   edits remain permitted. Do not let a fixture-only permission become a DB error.
5. Remove automatic approval pruning from source/staff photo updates. Preserve
   exact approved ID+immutable-URL pairs as local metadata; removed/replaced
   candidates are absent from public output because the projection matches both.
   Owner/admin may deliberately replace the approval set via publish. Restoring a
   previously approved immutable image may reuse its matching pair; changed content
   must use a new immutable URL/version. This resolves the SQL guard mismatch
   without giving connectors approval authority.
6. Derive initial source ownership/custom registration from the verified pinned
   mapping, not `Object.keys(defaultedFields)`. Unmapped defaults stay local;
   later mapping changes require reviewed ownership registration.
7. Bind receipt/history semantics to A's schema and D's source head. `verifyIngestion`
   checks the job/fence/definitions; it is not a substitute for C/D recording
   outcomes/checkpoints inside the outer transaction. Source history and receipt
   failures must throw so no animal update can commit alone.

Required B evidence: tests using A's actual corrected SQL, not just a memory
repository, for numeric-ID mapping, source/custom create, all publication roles,
approved-photo replacement, provenance round-trip, true CAS, receipt replay and
transaction rollback. Expose the same adapter to C/D only after G2 passes.

## C — precise pinned import follow-up

Keep C-owned parser/UI/import-service files. Wait for A's job/provenance shape and
B's transaction adapter; continue parser/UI fixtures independently.

- Persist the complete immutable definition seal, mapping snapshot/revision,
  source object+hash, matching decisions/as-of and verified initiator at enqueue.
  A stable mapping namespace ID must survive new mapping revisions. Scope every
  load to org+job/mapping; changed definitions require a new reviewed job.
- Implement `commitBatch` as above, consuming B's bound writer and identity lookups;
  no remote writer call or separate checkpoint commit. Use A's delegated job
  authority and recheck membership in the batch transaction. A revoked initiator
  stops further batches; prior committed batches are retained.
- Keep `(org,job,row)` outcome/idempotency and `(org,mapping,key)` identity separate.
  Stable-key, reviewed and create-only origins must all round-trip from A's SQL.
  Rejections are durable and need a new reviewed job when corrected; do not retry
  rejected rows as if they were uncommitted. Remote photo import remains disabled.
- Add rollback-at-progress-write and lost-commit-ack tests using A+B's actual
  transaction adapter. Change partial-batch fixture expectations to whole-batch
  rollback; earlier completed batches still permit resumable partial jobs.

## D — PR #7 follow-up and deployment requirements

Keep PR #7 draft/unmerged. Change D-owned worker/ports/fixtures/deployment docs;
request SQL from A and adapter behavior from B, without editing their files.

- Replace per-row transaction plus standalone checkpoint with `commitPage` as
  above. Move all source heads/outcomes/seen IDs/counters/inbox consumption/cursor
  advancement into that one transaction. Rewrite the test that expects a durable
  first row after second-row failure; add checkpoint failure rollback and
  uncertain-commit replay tests. Repeat unchanged/stale/empty-page cases too.
- Build the DurableConnectorStore facade against A's lease/inbox/job definitions
  and B's bound repository. DB time/fence/generation checks must occur inside every
  committing unit; preflight `assertLease` alone does not authorize a later write.
  Protect source-head reads/updates with the same connection lock/CAS protocol.
- Keep pre-fetch revisions pinned across retry. Narrow stored snapshots to the
  required identity/revision metadata instead of whole AnimalRecords with private
  notes/documents. Enforce bounded traversal/snapshot storage. New custom mapped
  fields on existing records need A+B's reviewed ownership registration.
- Preserve source ordering, equal-revision/different-digest conflict, digest
  history, immutable retry inputs, missing-review conservatism and no implicit
  external writes. Never auto-publish or convert compatibility keys into IDs.
- Provide a real deployment adapter plan, but DO NOT deploy: reviewed PostgreSQL
  transport, private secret resolver/rotation, trusted workload verifier, durable
  outbox/queue/reaper, supervised Node 22.18+ worker, DB deadlines below delivery
  timeout below lease expiry, per-connection fencing and bounded retries.
  Browser lifetime is irrelevant. Actual implementations of transport/store/auth
  are still absent, not implied by the port definitions.
- Verify raw Cognito envelope/pagination/monotonic timestamps and snapshot
  consistency before enabling `completeSnapshot`. The synthetic envelope is not
  live API evidence. Egress/TLS/SSRF, credential scope and private payload retention
  require staging verification. Sanitized controls/logs must omit secrets and
  private source bodies. Existing MBPR Form 38/proxy/Shopify remains untouched.

## Required combined acceptance before integration approval

- [ ] Schema mapping and actor/grants tests: anon, org 1001/1002, viewer, staff,
  owner/admin, revoked member and forged/cross-connection worker.
- [ ] Native/manual, stable-key CSV, create-only and reviewed CSV records survive
  SQL round-trip with identity/provenance/private data intact and unpublished.
- [ ] Connector mapped/unmapped/custom ownership works under actual SQL triggers;
  source/staff photo replacement does not mutate local approvals or leak photos.
- [ ] Inject failures after animal mutation, receipt, source head, outcome, seen-ID,
  count update and cursor/progress update: the entire page/batch rolls back.
- [ ] Inject second-row failure and final checkpoint failure; no writes from the
  failed unit survive. Replay a successful commit with lost acknowledgement;
  exactly one unit/row outcome, animal identity and receipt remain.
- [ ] Race two transactions/leases and a disconnect/revocation/config change;
  old fences and stale pre-fetch revisions cannot commit. Run genuine independent
  connections in staging in addition to local SQL fixtures.
- [ ] Empty/stale/unchanged pages still checkpoint atomically; failure/partial
  traversal never marks missing or deletes. Final missing-review batches have
  durable checkpoints and cannot bypass ownership/CAS rules.
- [ ] Import retries pin file/mapping/matching decisions; changed requests/seals
  fail; earlier committed batches remain resumable without duplicate records.
- [ ] Combined app checks and two-org UI/HTTP routing/refresh/history; MBPR paths
  byte-identical to contract base. Anonymous public projections exclude private
  fields and only deliberate owner/admin publication exposes approved profiles.
- [ ] Authorized live administrator preflight, separately reviewed migrations,
  isolated staging DB/Auth/Storage and actual provider/scheduler/rollback checks.
  These are NOT completed by this coordinator review.

## Evidence reproduced in this review

At exact PR #7 head, all 17 connector fixture tests and the documented strict
standalone connector TypeScript check pass. A separate adversarial
check extracted that same head into `/tmp/barkhaus-pr7-review-6e144ef`, used its
FixtureStore and worker, overrode `store.checkpoint` to throw, and processed one
record on a nonterminal page. Observed result:

```json
{"review":"checkpoint failure injection","animalCount":1,"committedWrites":1,"completedRows":["7"],"cursor":null,"jobState":"retry_wait","atomicPageRequirementMet":false}
```

The injected check completed successfully as a diagnostic; its atomicity assertion
is **not met**. It is evidence of the missing requirement, not an additional passing
acceptance test. A reports 41 local security/SQL/auth/route tests; B/C report their
fixture/typecheck/build results in their handoffs. Those claims were read, not
rerun here. No actual A+B persistence adapter exists to run the combined DB tests.
No production setting, branch, migration, MBPR path or deployment was changed.
