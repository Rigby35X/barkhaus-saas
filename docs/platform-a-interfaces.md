# A v1 persistence handoff

Contract SHA: 813d605d5465e3b78264a8abd4a9ed790f74f14f. These are
proposed fixture-tested interfaces, pending coordinator review and live preflight.
No B/C/D code or shared contract changed. No production cutover authorized.

## Physical mapping and assumptions

All new public tables use `platform_` prefixes to avoid adopting unknown legacy
schemas. `platform_animals` is additive, not a rename/backfill of `animals`.
Existing numeric identity is retained via `legacy_animal_id`; B must preserve its
original numeric DTO representation when present, rather than converting it to a
new identity. Its actual FK/type and migration mapping require administrator
export. Existing IDs/org IDs/private columns remain unchanged. New text IDs must
be server allocated, never names. Org FK assumes existing bigint-compatible
`organizations.id`, as Stage 1 already assumes. Unexpected existing objects fail
migration rather than being silently adopted. No historical animal auto-publishes.

`fields` stores core profile JSON; lifecycle, availability and photos have separate
columns. B must exclude those three from JSON and assemble the exact contract on
read. Field ownership uses the contract's `{kind:'barkhaus'}` or
`{kind:'connector',connectionId}` objects. Empty native ownership implies BarkHaus
for core fields and must be expanded into a complete contract map on read.
Custom values/owners are separate JSON maps; reviewed mapping operations register
ownership before updates. Worker creates require explicit ownership for every core
field. Medical/document IDs live in `platform_documents`, with immutable storage
object/content versions; never store signed URLs. `syncState` is derived by B/D
from connection status and complete-feed review outcomes, not deletion.

B validates complete runtime JSON, dates/enums, approved photo id+immutable HTTPS
URL pairs, sizes and unknown keys. Database guards supplement that validation.
No public v1 SQL projection is granted; B resolves tenant then uses the shared
allowlist. Anonymous access to legacy tables remains the Stage 1 exposure until
the separately gated Stage 2. Do not switch any MBPR reader.

## B: writer integration request

Use `requireOrganizationAccess` with the user-scoped client on every HTTP write.
Actor/role/worker scope never comes from a request body or signup metadata.
Use one trusted transaction for animal mutation, identity, receipt, source digest,
row outcome and checkpoint. Require `WHERE org_id=? AND id=? AND revision=?`, set
revision to expected+1, and return 409 with caller input preserved if zero rows.
The trigger checks increments but cannot force a caller to include a CAS predicate.

Serialize each idempotency tuple before any mutation, e.g. transaction advisory
lock on a hash of JSON array `[org, verifiedActor, key]`. Read receipt first;
identical operation/digest returns saved result without writing, changed reuse
fails. `barkhaus_private.record_write_receipt` stores/compares the final result;
it is not by itself an exactly-once writer. Tests prove storage constraints and
transaction rollback, not B's eventual HTTP integration. A missing transactional
DB transport remains an integration blocker; do not emulate transactions with a
sequence of independent Supabase REST calls. Trusted ledger functions intentionally
have no browser/service_role execute grant. Establish a least-privilege server
execution capability in a later reviewed migration once B's deployment is known.

`signPrivateAnimalDocument` is available in dashboard-auth.ts; it rechecks current
membership, validates org-prefixed object names, uses the private bucket and a
60-second signed URL with `no-store`. B owns its HTTP route and must ensure
object paths come from authorized document metadata. A revoked user's previously
issued URL can remain valid for at most its original 60 seconds; signed URLs are
bearer capabilities. Actual expiry still needs staging HTTP validation.

## C: namespace and pinned jobs

Register stable `platform_import_namespaces(org_id,id)` once per saved mapping.
Mapping revisions are immutable. Job ID, kind, mapping revision, connection and
file SHA-256 cannot change during retry. Row outcomes use `(org_id,job_id,row_key)`.
The import identity unique key is `(org_id,import_mapping_id,import_key)`; no key
requires explicit reviewed/create-only behavior in C/B. Never use names to match.
The same job pins file digest and mapping; a changed file needs a new reviewed job.
Schema does not approve arbitrary transforms or fetch remote photos: C validates
those through its allowlist/vetted fetch service. Write all rows through B.

## D: scoped trusted worker

`barkhaus_connector_worker` is NOLOGIN without BYPASSRLS. No browser or service
role is a member. A verified server transaction can select that role and use
transaction-local `barkhaus.worker_org`/`barkhaus.worker_connection`. Never pass
these settings from a browser. RLS rechecks the active connection. Animal trigger
permits only that connection's owned fields/custom keys, protecting local notes,
publication, approvals and identity. Connection credentials are private and have
no browser/service-role table grants. Credential resolver capability remains a
reviewed deployment requirement; no privileged token is added by this work.

Mappings/jobs use same-org FKs plus mapping/connection agreement. One running job
per connection is enforced; D handles expiring leases and durable resume safely.
`platform_source_commits` deduplicates source digests, not lexically sorted opaque
provider revisions. B/D must enforce source ordering and checkpoint transactions.
Do not mark missing until a valid complete traversal. Empty feed never deletes.

## A3: trusted account operations

`provision_initial_owner(existing_org, verified_auth_uuid)` is administrator-only,
locks the organization and refuses any existing membership. Creation of a new
organization row remains blocked on live required-column/default reconciliation;
never infer org IDs or roles from signup data. No browser self-provision endpoint.

Trusted issuance calls `issue_organization_invitation` after Auth-verifying the
issuer UUID. It rechecks owner/admin membership, issues only admin/staff/viewer,
and caps expiry at seven days. Generate 32 cryptographically random bytes outside
the DB, hex encode, store only SHA-256 and deliver token securely. No email sender
or credential is introduced. Browser acceptance hashes the pasted token and calls
`accept_organization_invitation`; DB requires confirmed matching Auth email,
current issuer permission, expiry and unused token under row lock. Existing or
revoked memberships require explicit admin review. No owner role can be invited.

Recovery redirect allowlist is app.barkhaus.io and local Vite port 5173 only;
coordinator must review explicit preview origins before adding them. Configure
these exact redirects in Supabase Auth. Password recovery UI blocks workspace
entry during recovery, verifies Auth before updating and signs out afterward.
Supabase owns recovery-token verification, expiry and reuse rejection; local mocks
do not prove those deployed behaviors. No role is consumed from user metadata.
