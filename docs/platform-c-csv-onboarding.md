# CSV onboarding C: integration and evidence

Contract baseline: `813d605d5465e3b78264a8abd4a9ed790f74f14f`.
Branch: `feature/platform-c-csv-onboarding-v1`. All changes are within C's
exclusive paths. No navigation, contracts, manifests, lockfiles, SQL, legacy
animal helpers, MBPR readers, public keys, Form 38, proxy or Shopify changes.

## Implemented behavior

- Pure UTF-8 CSV parsing, BOM, CRLF, quoted commas/newlines and escaped quotes.
  Record numbers are logical CSV records: header 1, first data row 2. Blank and
  case-insensitive duplicate headers fail; column/quote failures are row issues.
- Required name/species, real nonfuture ISO birthdays, explicit age transforms,
  enums, saved status overrides, unknown status review, private custom mappings,
  exact mapping keys, duplicate target rejection and a transform allowlist.
- Preview has no persistence/network dependency. The server preview only reads
  the scoped saved mapping and resolves authorization; it never enqueues/writes.
- Stable keys use `(orgId, mappingId, importKey)` tuples. Equal names never match.
  Duplicate keys reject all ambiguous rows; correction requires a new job.
  Missing keys require an explicitly chosen create-only or reviewed mode.
  Reviewed updates pin typed animal ID + revision. Unresolved rows are rejected.
- New create-only jobs warn and require acknowledgement. All modes use
  `(orgId, jobId, logicalRow)` outcomes and writer idempotency. Reusing job ID
  with changed content must fail; repeating an identical enqueue must replay.
- SHA-256 pins exact UTF-8 content (including BOM), mapping contents/revision,
  matching decisions, job/org IDs and the normalization date. Do not recreate
  those inputs on retry. Date participates in the seal; a start replay across
  midnight may conflict safely. Recover the existing job ID instead.
- Limits: 5 MiB, 5,000 data rows, 100 columns/mappings, 20,000 characters/cell,
  200-character identity parts, 100 saved statuses, at most 50 attempted rows per
  runner invocation. Server rejects inflated job limits before animal writes.
- Per-row atomic work calls only the injected B `AnimalWriteService.execute`.
  Stable updates use only mapped fields, preserving unmapped fields. Custom keys
  need prior reviewed registration before an existing-animal update. No ownership
  transfer, publication command, photo approval or private-note edit is generated.
- Connected/published targets and targets retaining approved photos conflict;
  B additionally enforces field ownership/CAS. This deliberately requires review
  rather than editing an already published animal through onboarding.
- Photo mappings are rejected entirely, including HTTPS, private-address and
  redirect URLs. There is no fetch, DNS resolution or redirect handling path.
  Photos remain empty on creates; no photo is approved. A future vetted ingestion
  service is a separate dependency, not a URL validator masquerading as SSRF safety.
- Job outcomes/progress can be read and unfinished work requeued. Exceptions
  stop a batch with `partial`; committed outcomes are authoritative on retry,
  even if progress saving or the response failed. Rejected rows are terminal for
  that immutable job; fix them in a new reviewed job. `partial` with all rows
  processed means review required, not automatic retry of rejected rows.

## Coordinator UI composition

Import `CsvOnboarding` and `CsvOnboardingClient` from
`apps/dashboard/src/features/imports/index.ts` and compose it in the authorized
organization route. Pass `{orgId, canImport, client}`; organization changes remount
its private state. `canImport` is presentation only. The server verifies every
operation independently, including reads; viewers cannot use onboarding.

The client exposes `listMappings`, `saveMapping`, `preview`, `start`, `job` and
`retry`. Bind these to authenticated server calls. `behavior: 'fixture'` visibly
discloses synthetic/nonpersistent behavior; use `'persistent'` only after the
real adapter and staging verification exist. No client implementation or route
is silently backed by localStorage, an anonymous SDK, or a production endpoint.
The UI exports a mapping/status editor, matching review, per-row error table,
confirmation, job ID recovery, counts and retry controls. It holds the start
request ID across failed submissions; retries use the existing job ID. Preserve
that ID in a future authorized jobs list for recovery after page reload.

Use JSON numbers versus strings to preserve reviewed animal ID types in the
transport; the UI's ID type selector makes this choice explicit. Server side,
`CsvImportService` in `apps/tenant-site/src/services/imports/service.ts` provides
all six corresponding methods plus `runBatch`. The parser is a dependency-free
portable module under dashboard `features/imports/csv.ts`; the server imports it
explicitly. It contains no browser, SDK or server-secret dependencies.

## Precise A/B persistence requests (blocking persistent activation)

`ImportStore`, `JobSession` and `RowTransaction` are required integration ports,
not a database implementation. The fixture store exists only under tests.

1. **A:** migrations for immutable org-scoped saved mapping revisions, private
   immutable source references/digests, job definitions/seals, row outcomes,
   unique `(org, job, row)`, unique `(org, mapping, importKey)` identity links,
   mapping/job/animal same-org FKs and member-role/RLS policies. Stable mapping
   IDs remain constant across revisions. Private sources/outcomes must not be
   available to public readers. Validate definitions on persistence and disallow
   changing matching/file/mapping/asOf/seal after enqueue.
2. **A+B:** implement `ImportStore` against the approved schema. `enqueue` must
   atomically save the immutable source+mapping snapshot+job and durable queue
   outbox; replay identical IDs/payloads, reject changed reuse. Validate size
   during HTTP streaming before buffering, decode UTF-8 strictly, and enforce
   the same limits again in the service. Mapping operations must register private
   custom keys through reviewed ownership policy and reject changed revisions.
3. **B:** supply a transaction-bound `AnimalWriteService`. `JobSession.row` must
   lock the scoped outcome key and expose B's writer on the **same database
   connection/transaction** as identity lookup/binding and `record(outcome)`.
   Lock/serialize stable identity lookup before deciding create/update, including
   absent-key races across jobs. CAS, writer replay ledger, unique import identity,
   animal mutation and row outcome commit together; throw rolls them all back.
   Calling a standalone writer that commits first is insufficient. The frozen
   v1 writer does not expose this transaction binding, so B/coordinator must agree
   a factory/adapter without C editing the shared contracts.
4. **A+B:** `findIdentity`/`findAnimal` require scoped organization checks and
   current revision/ownership; `bindIdentity` must reject reassignment. B must
   revalidate membership and JSON, enforce ownership/CAS and return unpublished
   records with zero approvals. Persist idempotency against actor/org/operation/
   payload. The orchestration never creates an alternate animal repository.
5. **Coordinator/runtime:** authenticated HTTP adapters resolve the member from
   verified server context; never deserialize `WriteActor` from JSON. The injected
   `Authorize` must check current active membership, not cached UI access. No API
   routes are activated in this PR because A/B adapters are unavailable. Sanitize
   transport errors; never log CSV text, raw records or provider errors.
6. **Coordinator/runtime:** durable queue runner calls `runBatch` independently
   of browser lifetime with the initiating member's server-resolved identity,
   rechecking membership per row (and in B). Do not impersonate a connector worker
   or invent an uncontracted privileged import actor. Use `withJob` exclusive
   leases (renewal/expiry), durable retry outbox, a bounded timeout, capped retry
   attempts/backoff and monitoring of exhausted jobs. `queueRetry` deduplicates
   org/job scheduling and never changes the immutable definition. `saveProgress`
   derives from durable outcomes; never trust browser counters. Rejected rows
   need review, not repeated scheduling. `listMappings` returns latest revisions
   in the service; do not expose another org's historical mappings.

No new package dependencies are requested. Existing TypeScript, React, Vite's
esbuild and Node 24 tooling suffice. A vetted photo service is not required for
this first milestone because remote photo importing is explicitly disabled.

## Verification and limits of evidence

Run at repository root (Node 22.18+; checked using Node 24.19.0):

```sh
node apps/dashboard/tests/imports/imports.test.mjs
node apps/dashboard/tests/imports/ui.test.mjs
node node_modules/typescript/bin/tsc -p apps/dashboard/tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck apps/tenant-site/src/services/imports/service.ts
npm --prefix shared/contracts run typecheck
node shared/contracts/tests/animal.test.mjs
```

21 parser/service tests and one UI server-render/bundle test pass. Tests use
synthetic orgs 1001/1002, injected authorization and a rollback-capable test double
for B's writer/transaction. They exercise valid/invalid input, unchanged preview
state, saved mappings/custom/status/date normalization, matching scope, CAS,
ownership, bounded jobs, failure after a committed row, uncertain commit response,
immutable-job tampering, exactly-once replay and rollback of a broken publication
invariant. UI test checks exported composition, fixture disclosure and viewer
controls, not interactive browser/network integration.

Mocked: database transactions/locks, writer, membership resolution, private object
storage, queue/outbox and persistence. Implemented: parser, mapping validation,
preview, write-command orchestration, batching/retry decisions and UI. Persistent:
none in this branch. Exactly-once fixture success is not staging/production proof.
No live data mutation, schema application, deployment, merge or public cutover.

Repository Git fetch/push could not reach the inherited proxy (`proxy:8080`). The
GitHub connector verified the baseline branch SHA and absence of an existing
remote C branch. Remote publication uses that connector with an inspected parent
and non-forced ref updates; no existing remote work is overwritten.

Additional regression checks passed: dashboard strict application typecheck,
server strict typecheck, shared-contract strict typecheck and 13 contract tests,
26 existing dashboard security tests (including PGlite), and dashboard Vite build.
The exported UI is bundled separately by its rendering test because coordinator
navigation has intentionally not been modified. Existing dependency directories
were reused; manifests and lockfiles were unchanged.
