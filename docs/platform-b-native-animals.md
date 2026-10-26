# Assignment B handoff

Contract base: `813d605d5465e3b78264a8abd4a9ed790f74f14f`.
Branch: `feature/platform-b-native-animals-v1`; isolated worktree `/workspace/barkhaus-b`.
Acknowledged v1 semantics, B's exact editable paths, and all six acceptance cases.
No contracts, SQL, manifests, lockfiles, navigation, MBPR public integration or
Shopify files changed. No live data writes, migrations, deployment or merge.

## Implemented surface

`apps/tenant-site/src/services/animals/index.ts` exports:

```ts
new AnimalWriteService(repository: AnimalRepository)
  .execute(actor: WriteActor, command: AnimalWrite): Promise<WriteResult>
  .read(actor, orgId, animalId?)
  .document(actor, orgId, animalId, documentId)
  .publicProfile(orgId, publicProfileKey)
createAnimalHttpHandler({ service, authenticate })
validateAnimalWrite(untrustedJson)
withAnimalTransaction(repository, async (writer, tx) => { /* C/D outcomes */ })
```

The frozen `AnimalWriteService` interface is implemented unchanged. Additional
read/document helpers are B-owned implementation APIs. `publicProfile` is an
internal projection helper: no public transport is enabled. A future public
route must resolve organization from trusted host configuration, never from a
claimed public key or query parameter alone. MBPR's public reader is untouched.

Commands enforce exact keys, nested types, enums, dates, HTTPS candidates,
bounded JSON/custom depth, actor revalidation, tenant scope, role permissions,
per-core/custom ownership and CAS. Worker grants are connection-specific;
HTTP accepts members only and cannot claim worker/CSV authority. Receipts bind
organization + verified principal + key to canonical operation/payload; changed
payloads conflict. Replays return the original result snapshot without a write.
Only successful commands receive receipts. Revision conflicts preserve storage.

Native and CSV creates default unpublished with no approvals. Source creates own
all core fields and their initial custom keys; existing custom/core ownership is
never patched. New mapped custom keys on existing records require the reviewed
mapping operation in the contract. Names never match identities. External IDs,
CSV keys and public profile keys have separate scoped uniqueness boundaries.
Opaque source revisions use committed-history dedup plus CAS; the adapter must
also enforce connection leases and provider ordering. No lexical revision sort.
Photo replacement drops old approvals unless both ID and URL remain identical.
Approvals/publication are owner/admin-only via the frozen publish command.
Unpublish/archive retain identity, notes, documents and the allocated public key.

The dashboard exports `NativeAnimals` and `AnimalEditor`; existing AnimalsTab
loads this module without changing coordinator navigation. The editor supports
all core fields/statuses, age variants, source read-only controls, local notes and
registered local custom values, photo ordering, deliberate approval/publication,
unpublish/archive and signed document access. Failed saves retain attempted
input; latest-record comparison and draft discard are explicit. Network retries
reuse an unchanged command/key; modified input gets a new key. There is no
automatic overwrite/rebase after a 409.

Legacy admin animals returns 410/no-store for every verb, with no DB/network
access. Legacy dashboard animal reads use the v1 transport through an explicit
read-only projection; numeric-only callers fail explicitly on string IDs.
Legacy partial-row create/update/delete helpers retain their exports but fail
with upgrade instructions because they cannot safely infer revision or command
semantics. Unrelated API exports are preserved. Coordinator should migrate old
onboarding/unused legacy animal screens before re-enabling their write buttons.

## Required dependencies: A and coordinator

These are exact adapter requirements, not a proposed competing SQL schema.
B's `repository.ts` is the required persistence boundary. There is intentionally
NO production memory adapter, guessed REST mapping or invented RPC/table name.

1. A's `requireOrganizationAccess` currently verifies token and active membership
   but returns only a client. Supply a reviewed resolver returning the Auth-verified
   user ID/current role/org, plus a transaction-bound repository. Repository
   `verifyActor` must bind to that ambient verified session (or authenticated worker
   capability), re-read active membership/connection grant and hold revocation-safe
   locks through commit. Looking up a claimed user/connection's existence is not
   authentication. Caller role is never authority. Reject malformed/unknown roles.
2. Reconcile actual schema into the frozen record without losing old IDs/private
   columns. Enforce positive revision, immutable org association, scoped public
   keys/CSV/external identities and same-org connection/mapping/job references.
   `put(record, expectedRevision)` must atomically CAS/insert and apply all unique
   constraints; return false for conflict. RLS/grants must reject direct bypasses,
   viewers, cross-org writes, ownership changes and source publication changes.
3. One serializable transaction or equivalent lock discipline must contain actor
   revalidation, identity lookup, CAS, source-revision history, successful receipt
   and C/D row outcome/checkpoint. Lock missing identity/receipt namespaces too;
   unique constraints handle races. No check-then-write across independent REST
   requests. Retry serialization failures safely; no external effects in callbacks.
   Receipts are private (contain original result/command fingerprint); constrain
   org/principal scope and retention to cover authorized job retry windows.
4. C/D call `withAnimalTransaction` using the same concrete transaction adapter
   for pinned jobs, mappings, source file digest, row outcomes and checkpoint.
   They derive stable row keys and check existing outcomes INSIDE that transaction
   before `execute`. `verifyIngestion` validates context; it does not itself record
   an outcome. C/D must persist every outcome in the outer transaction, including
   rejections; throw on a partial commit failure. An edit command cannot carry job
   metadata in v1, so bind the pinned CSV context to the adapter, never extra JSON.
5. D must provide a verified lease/capability and connection-scoped provider lookup,
   serialize fetch/apply per connection, capture CAS before fetch, persist history
   and reject stale opaque revisions. A null revision needs a trusted provider
   ordering/checkpoint strategy; do not claim that CAS alone orders external feeds.
6. `isPhotoAllowed` must verify org ownership, immutable content/version and vetted
   image ingestion. HTTPS syntax alone is insufficient. No remote URL fetching
   occurs in B. Supply private candidate uploads and authorized completion through
   `edit_native`/`source_upsert` with the captured expectedRevision. New completions
   are unapproved; publication uses a separate CAS command. Animal uploads remain
   blocked until this reviewed path exists. Shared website/logo image upload is
   restricted to decoded raster images; PDFs and other documents are rejected.
7. `signPrivateDocument` must verify current membership, record/object/organization
   association, a private bucket and a maximum 60-second signed URL; never return
   a public image URL. No private upload/link mutation command exists in frozen v1:
   A/coordinator must supply a reviewed ingestion/association path, not add arbitrary
   document IDs to `edit_native`. Signing revocation cannot invalidate already-issued
   URLs; the fixed short TTL bounds that exposure.
8. Replace `runtime.ts`'s explicit 503 gate only after these adapters pass review.
   The gate consumes A's current auth helper and never writes. Integrate the verified
   resolver using `createAnimalHttpHandler`. Decide deployment CORS/routing for
   dashboard-to-tenant origins centrally; the handler grants no wildcard CORS.
   Production browser reads/writes are unavailable until this integration.

## Evidence and acceptance limits

Executed locally on Node 24.19.0 using existing installed dependencies linked
from the original checkout; no install/manifests/locks changed.

| Check | Result |
| --- | --- |
| `node apps/dashboard/tests/animals/service.test.mjs` | 15 passed |
| `node apps/dashboard/tests/animals/editor.test.mjs` | 4 passed |
| `npm run test:security --workspace=apps/dashboard` | 26 passed (6 access, 11 RLS, 5 auth, 4 routes) |
| `node_modules/.bin/tsc -p apps/dashboard/tsconfig.app.json --noEmit` | passed |
| Strict standalone tsc of services/animals/index.ts and http.ts | passed |
| `npm --prefix shared/contracts run typecheck` | passed |
| `node shared/contracts/tests/animal.test.mjs` | 13 passed |
| Dashboard Vite production build | passed |
| Tenant-site Astro production build | passed; existing Node 24/local vs Node 22/Vercel warning |
| `git diff --check` | passed |

Standalone service typecheck command:

```sh
node_modules/.bin/tsc --noEmit --strict --allowImportingTsExtensions --target es2023 --module nodenext --moduleResolution nodenext apps/tenant-site/src/services/animals/index.ts apps/tenant-site/src/services/animals/http.ts
```

Acceptance 1: transactional fixture reload across service instances, lossless edit
and same-name identity separation pass. This is NOT restart-safe storage evidence.
Acceptance 2: injected HTTP/repository authorization, forgery/revocation/tenant tests
and retired route pass; existing PGlite security suite passes. New v1 DB adapter/RLS
and real bearer HTTP checks remain blocked on A/staging.
Acceptance 3: concurrent service CAS, 409 transport, retry replay/mismatch, receipt
failure rollback and candidate CAS pass. Rendered editor and retry helper checks
pass. Interactive browser conflict/reload and actual upload completion are pending.
Acceptance 4: exact public projection, unpublished candidates, approval, immutable
keys, unpublish/archive pass in fixtures. No public v1 deployment is claimed.
Acceptance 5: rendered source-disabled/local-enabled controls and inbound ownership/
publication/approval preservation pass. Live sync and durable worker deployment
are D's pending dependencies.
Acceptance 6: fixture signed document association/TTL/revocation and rejected public
document uploads pass; existing route resolution tests pass. No real private
Storage signature expiry or interactive refresh/back/forward verification occurred.

## Remote delivery

Shell git fetch/ls-remote repeatedly failed because configured proxy:8080 was
unreachable. Connected GitHub inspection independently verified the exact base
commit and branch, and found no existing B branch. Use GitHub's Git-data APIs to
publish the local tree without overwriting remote work; retain the local commit
if normal git push remains blocked. Draft PR targets the contract branch.
