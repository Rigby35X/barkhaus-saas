# First milestone implementation assignments

Use [kickoff](platform-kickoff.md), [v1 contracts](platform-contracts-v1.md),
and [baseline evidence](platform-validation.md). At contract freeze, the coordinator
had completed the contract/baseline task and A's parallel **read-only** inventory;
B/C/D feature implementation had not been launched. All four implementation
agents are now running in separate Cloud tasks from the frozen contract commit.

Subsequent worker handoffs and required corrections are tracked in
[the integration checklist](platform-integration.md). Its dependency gates and
transaction decisions apply before connecting these modules or merging PR #7.

## Branches, ownership and gates

The coordinator prepares these local task branches at the same reviewed-contract
commit (resolve the exact SHA with `git rev-parse <branch>` before starting):

| Assignment | Branch | Exclusive editable paths |
| --- | --- | --- |
| A: identity and sole schema owner | `feature/platform-a-identity-schema-v1` | `supabase/migrations/**`, `supabase/audits/**`, `apps/tenant-site/src/lib/dashboard-auth.ts`, `apps/dashboard/src/lib/auth.ts`, `apps/dashboard/src/lib/access.ts`, `apps/dashboard/src/hooks/useOrganizationSession.ts`, `apps/dashboard/src/components/LoginScreen.tsx`, `apps/dashboard/src/features/identity/**`, `apps/dashboard/tests/{access,rls,server-auth}.test.mjs`, `apps/dashboard/SECURITY_ROLLOUT.md`, `docs/platform-a-*` |
| B: native management and shared server writer | `feature/platform-b-native-animals-v1` | `apps/tenant-site/src/services/animals/**`, `apps/tenant-site/src/pages/api/v1/animals/**`, `apps/tenant-site/src/pages/api/admin/animals.js`, `apps/dashboard/src/features/animals/**`, `apps/dashboard/src/lib/api.ts`, `apps/dashboard/src/tabs/{AnimalsTab,AnimalModal}.tsx`, `apps/dashboard/src/components/{AnimalForm,MBPRPuppyForm,PawsAnimalForm,PawsAnimalList}.tsx`, `apps/dashboard/src/lib/upload.ts`, `apps/dashboard/tests/animals/**`, `docs/platform-b-*` |
| C: CSV onboarding | `feature/platform-c-csv-onboarding-v1` | `apps/dashboard/src/features/imports/**`, `apps/tenant-site/src/services/imports/**`, `apps/tenant-site/src/pages/api/v1/imports/**`, `apps/dashboard/tests/imports/**`, `docs/platform-c-*` |
| D: connector framework and Cognito | `feature/platform-d-connectors-v1` | `apps/dashboard/src/features/connectors/**`, `apps/tenant-site/src/services/connectors/**`, `apps/tenant-site/src/pages/api/v1/connectors/**`, `apps/dashboard/tests/connectors/**`, `deploy/connectors/**`, `docs/platform-d-*` |
| Coordinator | `feature/platform-contracts-v1-20261026` | `shared/contracts/**`, `docs/platform-{kickoff,contracts-v1,assignments,validation}.md`, all manifests/lockfiles, app navigation/composition including App.tsx/Sidebar/routes and integration tabs |

Brace lists above denote exact named files. A owning migrations means every SQL
addition requested by B/C/D goes through A; no independent SQL in worker PRs.
B owns the full legacy `lib/api.ts` file but changes only animal-related exports
unless the coordinator agrees to a wider change. A supplies authorization helpers
without editing B's service. Existing API/application functions stay compatible.
Do not alter MBPR public feed/components/layouts, stable keys or Shopify paths.
Do not edit files outside the ownership table without a coordinator handoff.

Launch each assignment in a separate isolated cloud task/checkout on its branch;
never have these workers switch or edit the coordinator's shared checkout.
If a local checkout is used instead, create an explicitly assigned separate
worktree. Record the exact contract SHA in each PR. No production or live-data
mutation is authorized by these fixture/staging assignments.

Before implementation, each worker acknowledges v1, ownership and acceptance
criteria, and reports incompatibilities to the coordinator. Contract changes
are approved centrally, then all affected branches rebase on the same update.
Independent UI/parser/adapter work can use the service interface and fixtures;
persistent integration waits for A's reviewed schema and B's common writer.
Coordinator composes navigation only after each module exports its entry point.

## A — identity, staging and sole schema owner

Deliver small PRs: (A1) read-only preflight/schema reconciliation and fixture
schema; (A2) additive staging migrations/policies; (A3) recovery/invitations and
trusted organization provisioning. Keep Stage 1/Stage 2 cutover prerequisites
from SECURITY_ROLLOUT.md. No claim of production rollout from local SQL tests.

Reconcile the mapping table with an authorized schema export, preserving
organization IDs, existing animal IDs and all private data. Schema requests:
required organization FK; separate statuses/publication; revision/CAS; immutable
public-key uniqueness `(org_id, public_profile_key)`; import identities
`(org_id, mapping_id, import_key)`; external identities
`(org_id, connection_id, external_record_id)`; per-field/custom-key ownership;
ordered photo candidates and local approval metadata; private medical/document
storage; mappings/jobs/outcomes/idempotency with tenant isolation. Establish
connection+mapping+job same-org FKs and explicit column constraints. Additive
backfills are reviewed, not automatic publication or destructive column renames.

Acceptance tests (PGlite first, then real staging HTTP):

1. Org 1001 and 1002 identities may use equal external IDs but cannot read/write
   each other's records, mappings, jobs, credentials or signed documents.
2. Viewer writes, revoked memberships, anonymous private reads and Storage writes
   fail. Staff cannot publish/manage memberships; owners/admins can publish;
   role provisioning cannot consume user-editable signup role metadata.
3. Scoped source/import uniqueness rejects duplicates; wrong-org mapping and
   connection references fail; organization association cannot be reassigned.
4. Two competing updates at revision N yield one success and one conflict,
   preserving all rejected values for review. Idempotent replay cannot accept a
   changed payload. New data starts unpublished; source workers cannot approve
   photos or modify publication/notes.
5. Recovery/invitation redirects are allowlisted, expired/reused tokens fail,
   account creation cannot self-promote, and private-document access expires.

Blocked staging/live work: current Supabase metadata requests return 401; no
administrator schema export or isolated staging deployment is available yet.
Finish fixture/preflight tooling independently. Never apply Stage 2 early.

## B — native animals and shared authorized writer

Implement `AnimalWriteService` and exact JSON validation at the server, using
A's verified membership helper and policies. B alone owns animal-write persistence
so CSV and connector callers cannot develop incompatible APIs. Expose a testable
repository boundary for C/D, create/edit/archive/unpublish/publish with CAS,
image ordering/approval and private documents. Migrate dashboard animal helpers
to the new service; retain unrelated helper behavior and route/history support.
Secure or retire the unsafe legacy admin route before exposing new write paths;
never copy its anonymous/default-org behavior. Source-owned fields are read-only
in UI; BarkHaus annotations remain editable. No external effects in UI helpers.

Acceptance tests:

1. Create a native animal in org 1001, reload and edit it through the service;
   no field is lost. A same-named second animal has a different internal ID.
2. Viewer, revoked and cross-org requests fail at HTTP/DB boundary, even when UI
   checks are bypassed. Missing org is rejected; request bodies cannot override
   server identity. Legacy routes no longer leak `select=*` under public cache.
3. Concurrent edit returns visible 409, preserves attempted form input and never
   silently overwrites. Create/edit retries replay exactly once; changed payload
   with reused key fails. Photo upload completion obeys the same CAS policy.
4. New animals/photos are not public; owner/admin deliberately approves and
   publishes. Allowlisted public read omits private fields/documents/custom data;
   unpublish/archive removes it from public lookup without deleting history.
5. Org 1002 connected animals show source-owned fields read-only but allow local
   notes/custom-owned edits; source sync does not reset publication or approvals.
6. Private documents require authorized signed access and cannot enter public
   image buckets. Refresh/back/forward retain authorized org/tab.

## C — CSV parsing, review and imports

Implement BOM/quoted comma/newline handling, duplicate/missing header detection,
mapping editor, saved/core/private-custom mappings, preview, validation and
row-level errors. Saved mapping IDs remain stable between imports; unknown status
values require review. Server enforces explicit byte/row/batch limits and executes
bounded writes only through B. No Cognito/other provider implementation here.
Job/mapping org and mapping IDs must match; transform IDs use a server allowlist.
Persist row outcome and idempotency in the same transaction as the animal write.
Do not download user-supplied photo URLs through an unrestricted fetch.

Acceptance tests:

1. Synthetic UTF-8 BOM CSV with quoted commas/newlines imports valid rows;
   malformed columns, dates, missing name/species and unknown statuses have exact
   row/field messages. Preview performs no writes and records are unpublished.
2. Stable-key repeat import changes the intended record without duplicates;
   same names/different keys stay distinct. Keys cannot escape org/mapping scope.
3. Missing keys force create-only or explicit reviewed create/update. Reviewed
   updates require ID+revision. New create-only jobs warn about deliberate new
   records; retrying the same job does not duplicate completed rows.
4. Inject a batch failure after committed rows, resume with same job ID, and
   verify outcomes/counts and exactly-once row writes. Oversized files/jobs fail
   before writing. Viewer and cross-org service calls fail.
5. Source-owned target updates conflict rather than bypass ownership. Unsafe
   URLs, redirects to private networks and unapproved downloads are rejected by
   the vetted ingestion path; no photo is approved by importing.

## D — inbound connector jobs and Cognito adapter

Implement capabilities/configuration, credential references, saved field maps,
scoped identity, pagination/checkpoints, sanitized status/errors, bounded retry
and asynchronous job worker. Start with synthetic Cognito fixtures and explicit
connection configuration. Reuse MBPR normalization knowledge without changing
the live public reader, proxy or Shopify integration. Do not ship Google Sheets
until framework/Cognito acceptance; show only supported/tested capabilities.

Document a deployable scheduler/worker topology in `deploy/connectors/**`: queue
durability, trusted worker authentication, one active lease per connection,
lease expiry, job timeout/cancellation, retry/backoff/jitter, checkpoint transaction,
dedup ledger, monitoring, credential rotation/disconnection and rollback.
Browser sessions only initiate/read job state. Never log credential values,
raw private records or provider error bodies. Connection and saved mapping org
must match. Capture CAS before fetching/applying source state and serialize
jobs per connection; opaque source revisions need provider ordering or committed
revision/digest dedup, not lexical comparison. A failed/partial traversal cannot
mark missing animals; a complete valid empty feed only marks review candidates.

Acceptance tests:

1. Cognito fixture maps stable external identity, fields/statuses and preserves
   `dog-38-<entryNumber>` public compatibility keys via the adapter, without
   assigning that key to internal identity. No provider or org defaults.
2. Replay same source revision/page/job, fail mid-page, retry, and run overlapping
   sync requests: one animal per scoped identity; stale responses cannot revert
   later revisions. Pagination advances only after durable row outcomes.
3. Source changes update only source-owned core/custom fields. Notes,
   applications, publication and photo approvals survive; new/replaced photos
   remain unapproved. Disconnecting preserves records and local information.
4. Invalid credentials return actionable sanitized state; rate limit respects
   retry delay. Failure is different from a successful empty feed. Missing
   records never delete; explicit mapped source status can change availability.
5. Org 1001 cannot invoke org 1002's connection, retrieve its secret ref or use
   a forged worker actor. Worker keeps functioning with all browsers closed.

## Coordinator integration and handoff

Integrate A's fixture/schema foundation, B's writer, then C and D in small PRs.
Rebase at each approved contract change; A alone modifies SQL. Each handoff must
include commit/PR, exact changed files, checks/counts, assumptions, blockers and
contract SHA. Review dependency requests centrally; workers do not regenerate
manifests/locks. Resolve file ownership before any overlapping edit.

Combined milestone tests use synthetic org 1001 (native/CSV) and 1002 (connector):
import/fix/retry, native edit/reload/deliberate publication, repeated inbound sync,
local field/photo approval preservation, common dashboard/public DTO, rejected
cross-org/viewer/anonymous requests, org/tab history retention, and byte-identical
MBPR integration paths. The current coordinator fixtures cover contract/policy
parts only. Run real persistence/UI/staging acceptance after those implementations
exist; do not advertise the complete milestone from fixture success.
