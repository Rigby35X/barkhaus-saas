# Animal contracts v1 and schema reconciliation

Coordinator baseline: `73631a4981267226ac7462bd36366c184acff501` from
`feature/dashboard-workspace-foundation-20260929`, including the routing/Auth
foundation. This supersedes the kickoff's recorded `5cb19f4` head. Implementation
branch: `feature/platform-contracts-v1-20261026`. No production cutover.

## Shared implementation

`shared/contracts/v1/animal.ts` freezes the private record and public allowlist.
`ingestion.ts` defines the one server write interface, CSV matching/job contracts,
connector identity, pagination, capabilities and sync jobs. `policy.ts` implements
pure ownership/CAS planning and missing-record review decisions. `legacy.ts`
implements a read-only reconciliation preview with explicit issues. Consumers
import these source modules by relative path; they have no SDK dependencies and
are intentionally outside npm workspaces to avoid dependency/lockfile changes.

Run from the repository root with Node 22.18+ (validated on Node 24.19.0):

```sh
npm --prefix shared/contracts run typecheck
npm --prefix shared/contracts test
```

These are contract/policy fixture tests, not implemented CSV writes, connector
sync, a database migration or proof of live authorization. No existing app has
been switched to the v1 service. A/B/C/D consume this same v1 contract; changes
go through the coordinator before any worker updates consumers.

## Frozen semantics

- Organization IDs stay positive safe integers. Existing internal numeric IDs
  remain valid; strings permit future server-issued IDs without deriving identity
  from names. Public profile keys are separately allocated, immutable after first
  publication, unique per organization, and never authorization credentials.
- Lifecycle: `intake`, `care`, `adopted`, `transferred`, `deceased`, `unknown`.
  Availability: `available`, `pending`, `unavailable`, `unknown`.
  Publication: `unpublished`, `published`, `archived`. Archive retains identity
  and history. Explicit unpublish/publish commands require CAS; archive does not
  delete external records. Publishing is owner/admin only; operational field edits
  and CSV onboarding permit owner/admin/staff; viewers cannot write.
- `Available`, `Available Now`, `Available: Now` map to care/available; `Pending`
  to care/pending; `Adopted`, `Deceased`, `Transferred` keep their distinct
  lifecycle and become unavailable. Intake is unavailable. `Published`, `Medical`,
  `Hold`, `Foster`, `Returned`, numeric codes and other values require an approved
  saved mapping; unknown values never become available or imply publication.
- A valid nonfuture ISO birthday takes precedence over an age label. Estimated
  birthdays remain marked; labels have an `asOf` date and never imply invented
  units/dates. Ambiguous numeric ages require review. Sex and size have explicit
  unknown values. Species remains an explicit nonblank customer value, no dog
  default. Age changes over time are computed at presentation from birthday.
- CSV records become native with CSV provenance; future CSV changes use the same
  authorized write path. Stable keys are unique on `(orgId, mappingId, importKey)`.
  A mapping ID is a stable source namespace, not a new ID per upload; retain its
  immutable revision separately. Jobs pin that revision and the private source
  file's SHA-256; changed files/mappings require a new reviewed job. No key means
  explicit create-only or reviewed matching.
  Never infer a match from name. Every mode persists `(orgId, jobId, row)` outcome
  atomically with writes; retries reuse the job ID. A new create-only job can
  deliberately create new records and must warn the operator.
- Connector identity is `(orgId, connectionId, externalRecordId)`; tuples avoid
  ambiguous delimiter joins. Source-owned fields can be changed only by their
  connection's trusted worker. BarkHaus-owned fields, notes, applications,
  custom fields and publication metadata survive sync. Ownership changes need
  a reviewed server operation, not a supplied patch. No external writes.
- Saved mappings target either core fields or named private custom fields.
  Custom values are JSON with per-key ownership; native/source writes carry
  values only and cannot reassign owners. Register newly mapped keys through
  the reviewed server mapping operation before updating existing records.
  Connection/mapping/job organizations and mapping IDs/revisions must agree.
  Reject duplicate mapping targets; transforms are allowlisted identifiers,
  never executable user input. Sync jobs pin their mapping revision too.
- Photos are ordered source/native candidates. Approvals live separately in
  BarkHaus-owned publication metadata and bind both photo ID and URL; sync adding
  or replacing a photo cannot approve it. Only approved HTTPS photos are public.
  URL checks here are not a remote-fetch/SSRF defense; downloading requires C's
  separately vetted service. Approval means the image itself was reviewed for
  private information. Replacing content behind an unchanged URL requires an
  immutable storage object/content version before approval in the write service.
- New records always start unpublished with zero approved photos, including
  import and connector creates. Public projection is an explicit nested allowlist:
  name/species/breed/age/sex/size/biography/approved photos/availability/profile key.
  Public records omit internal IDs, private notes, medical/adopter/foster/contact
  data, sensitive documents, custom fields and connector metadata. Public readers
  must resolve organization server-side; projection alone is not authorization.

## Database evidence and mapping

Live Supabase columns/types/policies remain **unverified**. Read-only OpenAPI
requests through the session proxy returned HTTP 401 with both existing anon
bindings. No new secret was requested and no credential values or live rows were
printed. A must run the administrator read-only preflight
`supabase/audits/dashboard_permissions.sql` and reconcile its output before SQL
approval. The Xano schema is historical evidence, not a Supabase schema dump.

| Evidence / existing columns | v1 target | Reconciliation rule |
| --- | --- | --- |
| `lib/api.ts` numeric `id`; Xano `int id` | `AnimalRecord.id` | Preserve exactly; do not use name/MBPR code as ID. |
| Supabase helper `org_id`; Xano `org`; stale `src/types/index.ts` `organization_id` | `orgId` | Require association; reject conflicting aliases. Physical FK/type await preflight. |
| `name`, `species`, `breed`, `breed_primary/secondary/third` | `fields.name/species/breed` | Name/species required before write; flag conflicting breed aliases. Preserve additional breeds in private custom metadata pending reviewed mapping. |
| Unrestricted `status`; legacy `Code` | `lifecycle` + `availability` | Use reviewed mapping above; retain raw value in reconciliation history. `Published` never auto-publishes. |
| `age` string/number, form `birthday`, `birthday_estimated` / `birthday_is_estimated` | discriminated `age` | Validate date/estimate; missing unit or conflicting flags require review. Xano has no birthday declaration. |
| `gender`, `size` | `sex`, `size` | Normalize recognized values; otherwise unknown; retain unmapped raw values during migration. |
| `description_long`, `description` | `biography` | Candidate text only; flag differences, review before public approval. Do not copy medical/internal notes. |
| `image_url`, possible `photo_url`, `main_image`, `additional_image_1..4`, `images` | ordered photo candidates + separate approvals | Accept string or image `{url}`; deduplicate in source order; default no approval. `AnimalModal.tsx` writes `photo_url` then removes it from main payload: existence/type unresolved. |
| `internal_notes`, `medical_notes`, `medical_notes_array`, `vet_file_uploads` | private notes + medical/document references | Keep original data; migration must not discard attachments; require private Storage/signed access. Never map to biography. |
| `foster_*`, `acquired_from*`, `new_owner_photo`, MBPR internal fields, adopter/contact data | private relationship/custom storage | Private by default. `new_owner_photo` is not an animal-profile photo. Existing columns retained until migration approved. |
| `updated_at` timestamp (Xano) | positive `revision` | Do not pretend timestamp is CAS. Add/backfill revision and atomic compare/update via A. |
| No verified publication/source/import/connection columns | publication, source, ownership, jobs/identities | Additive schema requests owned by A, not assumed existing columns. |

`reconcileLegacyAnimal` returns a **preview**, never writes or deletes columns.
It rejects missing/conflicting organization identity, flags ambiguous aliases and
keeps photos unpublished. It intentionally does not produce a complete persisted
AnimalRecord: origin/ownership/revision/private-field backfills require reviewed
schema facts. Resolving all review issues is a prerequisite to using a preview
as write input. Native status and historical data remain unchanged in this task.

## Server and persistence boundary

All B/C/D mutations implement `AnimalWriteService.execute`; no parallel CRUD APIs.
Transport must parse/validate untrusted JSON (exact allowlisted keys, lengths,
enums, dates, photo references and nonblank required fields). TypeScript types
and `planFieldUpdate` do not validate requests or establish identity. Resolve
active membership with `requireOrganizationAccess` and the user-scoped Supabase
client; never deserialize WriteActor from a request. Workers receive a verified
connection-scoped server identity, not a user's browser session.

A+B must make org FK/RLS, unique source identities, revision check/increment,
idempotency ledger and row outcome atomic. Expected revision mismatches return
`conflict` (HTTP 409), no partial patch; UI preserves attempted values, reloads
current data and requests review. A source create uses expectedRevision null;
uniqueness races resolve by reading the scoped identity and retrying under CAS.
Bind idempotency key to actor+org+operation+payload digest; replay identical
requests, reject different payload reuse. Source revision dedup/order rules are
provider-specific; an opaque revision is not lexically sortable. Check the
committed source ledger before applying retries. No new source field claims
ownership silently, and no failed batch advances its cursor.

Do not reuse `api/admin/animals.js` as this service: it lacks the membership
guard, uses anon credentials/default org 9, GETs `*` with public cache, permits
body override of org on POST and lacks org filtering on PUT. Its secured
replacement is a B deliverable reviewed by A before any new routes are exposed.

## MBPR compatibility boundary

No MBPR production source/read path changes. Preserve
`apps/tenant-site/src/lib/public-animals.ts`, MBPR components/layouts,
`available-pups/[animalKey].astro`, Form 38, animals-proxy and existing Shopify
links/integration. The new key adapter preserves `dog-{formId}-{entryNumber}`
including leading zeros; keys do not become private IDs. Dashboard Supabase
animals and MBPR's live feed are still separate pipelines. Shopify write/sync
implementation is not present in the inventoried source; verify external
deployment ownership before any later connector cutover. No endpoint defaults
or MBPR org IDs are introduced in shared contracts.

See [implementation assignments](platform-assignments.md) for exclusive ownership,
handoffs, acceptance tests and launch gates; [validation and blockers](platform-validation.md)
separates fixture results from staging and production evidence.
